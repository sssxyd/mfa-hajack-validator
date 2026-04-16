import { isMobileDevice, getResponsiveConfig, getFieldValue } from './utils';

interface MFAHajackValidatorOptions {
  uidSelector: string | null; // 用户唯一标识选择器
  guardedSelector: string | string[]; // 需要保护的元素选择器
  sendCode: (uid: string | null) => Promise<string>; // 发送验证码函数，返回mfa-session-id
  verifyCode: (mfaSessionId: string, code: string) => Promise<string>; // 返回空字符串或 'ok'/'success'(不区分大小写)表示成功，否则返回错误信息
  title?: string;
  confirmText?: string;
  cancelText?: string;
  inputPlaceholder?: string;
  errorText?: string;
  maxVerifyAttempts?: number; // 最大验证次数，默认为1
}

interface MFAHajackValidatorController {
  destroy: () => void;
}

interface Window {
  initMFAHajackValidator?: (options: MFAHajackValidatorOptions) => MFAHajackValidatorController;
}

const MODAL_ID = 'mfa-hajack-validator-modal';
const allowedClickElements = new WeakSet<HTMLElement>();

function initMFAHajackValidator(options: MFAHajackValidatorOptions): MFAHajackValidatorController {
  if (!options.guardedSelector || (Array.isArray(options.guardedSelector) && options.guardedSelector.length === 0)) {
    throw new Error('guardedSelector is required');
  }

  let pendingElement: HTMLElement | null = null;
  const maxAttempts = options.maxVerifyAttempts ?? 1; // 默认最多验证1次
  let verifySuccessCount = 0; // 验证成功计数器
  const selectors = Array.isArray(options.guardedSelector) ? options.guardedSelector : [options.guardedSelector]; // 将 guardedSelector 转换为数组

  const listener = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    // 检查是否匹配任何一个 selector
    let guardedElement: HTMLElement | null = null;
    for (const selector of selectors) {
      guardedElement = target.closest(selector) as HTMLElement | null;
      if (guardedElement) {
        break;
      }
    }
    if (!guardedElement) {
      return;
    }

    if (allowedClickElements.has(guardedElement)) {
      allowedClickElements.delete(guardedElement);
      return;
    }

    // 检查是否已达到最大验证次数
    if (verifySuccessCount >= maxAttempts) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    pendingElement = guardedElement;

    // 获取 uid 并发送验证码
    (async () => {
      try {
        const uid = options.uidSelector ? getFieldValue(options.uidSelector) : null;
        const mfaSessionId = await options.sendCode(uid);
        openModal(options, mfaSessionId, () => pendingElement, () => {
          pendingElement = null;
        }, () => {
          verifySuccessCount++; // 验证成功，计数器加1
        });
      } catch (error) {
        console.error('获取验证码失败:', error);
      }
    })();
  };

  document.addEventListener('click', listener, true);

  return {
    destroy: () => {
      document.removeEventListener('click', listener, true);
      closeModal();
    }
  };
}

function openModal(
  options: MFAHajackValidatorOptions,
  mfaSessionId: string,
  getPendingElement: () => HTMLElement | null,
  clearPendingElement: () => void,
  onVerifySuccess?: () => void
): void {
  const isMobile = isMobileDevice();
  const config = getResponsiveConfig(isMobile);

  const existing = document.getElementById(MODAL_ID);
  if (existing) {
    existing.remove();
  }

  const modal = document.createElement('div');
  modal.id = MODAL_ID;
  modal.style.position = 'fixed';
  modal.style.left = '0';
  modal.style.top = '0';
  modal.style.width = config.modal.width;
  modal.style.height = config.modal.height;
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = isMobile ? 'flex-end' : 'center';
  modal.style.backgroundColor = config.modal.backgroundColor;
  modal.style.zIndex = '2147483647';

  const panel = document.createElement('div');
  panel.style.backgroundColor = '#fff';
  panel.style.borderRadius = config.panel.borderRadius;
  panel.style.padding = config.panel.padding;
  panel.style.width = config.panel.width;
  panel.style.minWidth = config.panel.minWidth;
  panel.style.maxWidth = config.panel.maxWidth;
  panel.style.boxSizing = 'border-box';
  panel.style.fontFamily = 'Arial, sans-serif';
  panel.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.2)';
  panel.style.maxHeight = config.panel.maxHeight;
  panel.style.overflow = config.panel.overflow;
  
  // 移动设备底部弹起效果
  if (isMobile) {
    panel.style.borderRadius = '12px 12px 0 0';
    panel.style.animation = 'slideUp 0.3s ease-out';
    
    // 添加样式标签
    const styleTag = document.createElement('style');
    styleTag.textContent = `
      @keyframes slideUp {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `;
    if (!document.querySelector('[data-mfa-animations]')) {
      styleTag.setAttribute('data-mfa-animations', 'true');
      document.head.appendChild(styleTag);
    }
  }

  const title = document.createElement('h3');
  title.textContent = options.title ?? 'MFA 验证';
  title.style.margin = '0 0 ' + config.title.marginBottom;
  title.style.fontSize = config.title.fontSize;
  title.style.fontWeight = '500';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = options.inputPlaceholder ?? '请输入验证码';
  input.autocomplete = 'one-time-code';
  input.inputMode = 'numeric'; // 移动设备弹出数字键盘
  input.style.width = '100%';
  input.style.padding = config.input.padding;
  input.style.marginBottom = config.input.marginBottom;
  input.style.boxSizing = 'border-box';
  input.style.fontSize = config.input.fontSize;
  input.style.borderRadius = config.input.borderRadius;
  input.style.border = config.input.border;

  const message = document.createElement('div');
  message.style.color = '#c92a2a';
  message.style.fontSize = isMobile ? '14px' : '12px';
  message.style.minHeight = '16px';
  message.style.marginBottom = isMobile ? '16px' : '12px';
  message.style.wordBreak = 'break-word';

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.justifyContent = 'flex-end';
  actions.style.gap = config.actions.gap;

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.textContent = options.cancelText ?? '取消';
  cancelButton.style.flex = isMobile ? '1' : 'auto';
  cancelButton.style.padding = config.button.padding;
  cancelButton.style.fontSize = config.button.fontSize;
  cancelButton.style.borderRadius = config.button.borderRadius;
  cancelButton.style.border = config.button.border;
  cancelButton.style.backgroundColor = isMobile ? '#f5f5f5' : '#fafafa';
  cancelButton.style.cursor = config.button.cursor;

  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.textContent = options.confirmText ?? '验证';
  confirmButton.style.flex = isMobile ? '1' : 'auto';
  confirmButton.style.padding = config.button.padding;
  confirmButton.style.fontSize = config.button.fontSize;
  confirmButton.style.borderRadius = config.button.borderRadius;
  confirmButton.style.border = config.button.border;
  confirmButton.style.backgroundColor = '#1890ff';
  confirmButton.style.color = '#fff';
  confirmButton.style.cursor = config.button.cursor;

  const closeAndClear = (): void => {
    clearPendingElement();
    closeModal();
  };

  cancelButton.addEventListener('click', closeAndClear);
  cancelButton.addEventListener('mouseover', () => {
    if (!isMobile) {
      cancelButton.style.backgroundColor = '#f0f0f0';
    }
  });
  cancelButton.addEventListener('mouseout', () => {
    if (!isMobile) {
      cancelButton.style.backgroundColor = '#fafafa';
    }
  });

  confirmButton.addEventListener('click', async () => {
    const code = input.value.trim();
    const currentPending = getPendingElement();

    if (!currentPending) {
      closeModal();
      return;
    }

    message.textContent = '';
    confirmButton.disabled = true;

    try {
      const result = await options.verifyCode(mfaSessionId, code);
      // 返回空字符串或 'ok'、'success'(不区分大小写)表示成功
      const isSuccess = !result || result.toLowerCase() === 'ok' || result.toLowerCase() === 'success';
      if (!isSuccess) {
        // 返回值作为错误信息显示
        message.textContent = result || (options.errorText ?? '验证码错误，请重试');
        input.value = '';
        input.focus();
        return;
      }

      if (onVerifySuccess) {
        onVerifySuccess(); // 调用计数器增加回调
      }
      allowedClickElements.add(currentPending);
      closeAndClear();
      currentPending.click();
    } catch {
      message.textContent = options.errorText ?? '验证码错误，请重试';
      input.value = '';
      input.focus();
    } finally {
      confirmButton.disabled = false;
    }
  });
  confirmButton.addEventListener('mouseover', () => {
    if (!isMobile) {
      confirmButton.style.backgroundColor = '#40a9ff';
    }
  });
  confirmButton.addEventListener('mouseout', () => {
    if (!isMobile) {
      confirmButton.style.backgroundColor = '#1890ff';
    }
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      confirmButton.click();
    }
  });

  actions.appendChild(cancelButton);
  actions.appendChild(confirmButton);

  panel.appendChild(title);
  panel.appendChild(input);
  panel.appendChild(message);
  panel.appendChild(actions);

  modal.appendChild(panel);
  document.body.appendChild(modal);
  
  // 移动设备点击背景关闭
  if (isMobile) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeAndClear();
      }
    });
  }
  
  input.focus();
}

function closeModal(): void {
  const modal = document.getElementById(MODAL_ID);
  if (modal) {
    modal.remove();
  }
}

(window as any).initMFAHajackValidator = initMFAHajackValidator;
