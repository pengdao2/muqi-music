<template>

</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { isMobile } from '@/utils';

// 控制抽屉显示状态
const showDrawer = ref(false);

// 处理抽屉关闭后的操作
const handleDrawerClose = () => {
  // 抽屉关闭后的逻辑
};

// 一天后提醒
const remindLater = () => {
  const now = new Date();
  localStorage.setItem('trafficWarningRemindLater', now.toISOString());
  showDrawer.value = false;
};

// 标记为永久不再提示
const markAsDismissed = () => {
  localStorage.setItem('trafficWarningDismissed', '1');
  showDrawer.value = false;
};

// 组件挂载时检查是否需要显示
onMounted(() => {
  return;
});
</script>

<style scoped lang="scss">
.traffic-warning-trigger {
  display: inline-block;

  .mac-style-button {
    background-color: rgba(0, 0, 0, 0.05);
    color: #333;
    transition: all 0.2s ease;

    &:hover {
      background-color: rgba(0, 0, 0, 0.1);
    }
  }
}

.mac-style-drawer {
  border-radius: 10px 0 0 10px;
  overflow: hidden;
  position: relative;
}

.drawer-container {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.warning-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.app-icon {
  width: 100px;
  height: 100px;
  margin-bottom: 12px;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 14px;
  }
}

.warning-message {
  text-align: center;
  max-width: 520px;

  h3 {
    font-size: 28px;
    font-weight: 600;
    margin-bottom: 18px;
    color: #333;
  }

  .platform-support {
    display: flex;
    justify-content: center;
    gap: 20px;
    flex-wrap: wrap;
    margin-bottom: 16px;

    span {
      display: flex;
      align-items: center;
      font-size: 16px;
      color: #444;
    }
  }

  .description {
    font-size: 16px;
    line-height: 1.6;
    color: #444;
    margin: 0 auto;
  }
}

.action-links {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
  margin: 6px 0;

  a {
    display: inline-flex;
    align-items: center;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 16px;
    text-decoration: none;
    transition: all 0.2s ease;

    &.doc-link {
      color: #555;
      background-color: rgba(0, 0, 0, 0.05);

      &:hover {
        background-color: rgba(0, 0, 0, 0.1);
      }
    }

    &.download-link {
      color: #fff;
      background-color: #007aff;

      &:hover {
        background-color: #0062cc;
      }
    }
  }
}

.qrcode-section {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;

  .qrcode {
    width: 180px;
    height: 180px;
    border-radius: 10px;
    padding: 10px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    background: white;
  }

  p {
    margin-top: 14px;
    font-size: 15px;
    color: #0062cc;
  }
}

.support-section {
  width: 100%;
  text-align: center;

  h4 {
    font-size: 22px;
    font-weight: 600;
    color: #333;
    margin-bottom: 8px;
  }

  .support-desc {
    font-size: 15px;
    color: #555;
    margin-bottom: 20px;
  }
}

.payment-options {
  display: flex;
  justify-content: center;
  gap: 100px;
  flex-wrap: wrap;
  padding-bottom: 100px;
}

.payment-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;

  .payment-icon {
    width: 220px;
    height: 220px;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  span {
    font-size: 15px;
    color: #444;
  }
}

.drawer-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 30px;
  width: 100%;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10px;
  background-color: #fff;
  z-index: 999999999;

  .action-button {
    min-width: 110px;
    border-radius: 8px;
    font-size: 16px;
    padding: 8px 16px;

    &.primary {
      background-color: #007aff;
      color: white;

      &:hover {
        background-color: #0062cc;
      }
    }
  }
}

@media (max-width: 768px) {
  .warning-message {
    h3 {
      font-size: 20px;
    }

    .platform-support {
      gap: 12px;
    }

    .description {
      font-size: 13px;
    }
  }

  .app-icon {
    width: 64px;
    height: 64px;
  }

  .qrcode-section {
    .qrcode {
      width: 140px;
      height: 140px;
    }
  }

  .payment-option {
    .payment-icon {
      width: 190px;
      height: 190px;
    }
  }

  .drawer-actions {
    flex-wrap: wrap;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 10px;
    background-color: #fff;
    z-index: 999999999;

    .action-button {
      flex: 1 0 auto;
    }
  }
}
</style>
