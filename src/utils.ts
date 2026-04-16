/**
 * 根据 CSS selector 获取元素的值
 * 支持获取：input/textarea/select 的 value，其他元素的 textContent
 */
export function getFieldValue(selector: string): string | null {
  const element = document.querySelector(selector);
  if (!element) {
    return null;
  }

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.value;
  }

  if (element instanceof HTMLSelectElement) {
    return element.value;
  }

  return element.textContent;
}

/**
 * 设备检测：判断是否为移动设备
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  // 通过User-Agent判断
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'windows phone', 'blackberry', 'opera mini'];
  if (mobileKeywords.some(keyword => userAgent.includes(keyword))) {
    return true;
  }

  // 通过触摸事件判断
  if (typeof window !== 'undefined' && 'ontouchstart' in window) {
    return true;
  }

  // 通过屏幕宽度判断（iPad等大屏设备）
  if (window.innerWidth < 768) {
    return true;
  }

  return false;
}

/**
 * 获取响应式样式配置
 */
export function getResponsiveConfig(isMobile: boolean) {
  if (isMobile) {
    // 移动设备配置
    return {
      modal: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
      },
      panel: {
        width: '90%',
        minWidth: 'auto',
        maxWidth: '100%',
        padding: '24px 16px',
        borderRadius: '12px',
        maxHeight: '80vh',
        overflow: 'auto'
      },
      title: {
        fontSize: '18px',
        marginBottom: '16px'
      },
      input: {
        padding: '12px',
        fontSize: '16px',
        marginBottom: '16px',
        borderRadius: '4px',
        border: '1px solid #d9d9d9'
      },
      actions: {
        gap: '12px'
      },
      button: {
        flex: 1,
        padding: '12px',
        fontSize: '16px',
        borderRadius: '4px',
        border: 'none',
        cursor: 'pointer'
      }
    };
  } else {
    // 电脑端配置
    return {
      modal: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.45)'
      },
      panel: {
        width: '360px',
        minWidth: '360px',
        maxWidth: '100%',
        padding: '20px',
        borderRadius: '8px',
        maxHeight: '90vh',
        overflow: 'auto'
      },
      title: {
        fontSize: '16px',
        marginBottom: '12px'
      },
      input: {
        padding: '8px',
        fontSize: '14px',
        marginBottom: '12px',
        borderRadius: '4px',
        border: '1px solid #d9d9d9'
      },
      actions: {
        gap: '8px'
      },
      button: {
        flex: 1,
        padding: '8px 16px',
        fontSize: '14px',
        borderRadius: '4px',
        border: 'none',
        cursor: 'pointer'
      }
    };
  }
}
