import { REGISTERED_ICONS, renderIconHtml, preloadAllRegisteredIcons } from '../assets/icon-loader';

export interface MenuItemConfig {
  id: string;
  label: string;
  icon: string;
  description?: string;
}

export const DEFAULT_MENU_ITEMS: MenuItemConfig[] = [
  { id: 'status', label: 'Status', icon: REGISTERED_ICONS.status || 'status' },
  { id: 'puzzle', label: 'Puzzle', icon: REGISTERED_ICONS.puzzle || 'puzzle' },
  { id: 'storage', label: 'Storage', icon: REGISTERED_ICONS.storage || 'storage' },
  { id: 'store', label: 'Store', icon: REGISTERED_ICONS.store || 'store' },
  { id: 'monitoring', label: 'Monitoring', icon: REGISTERED_ICONS.monitoring || 'monitoring' },
  { id: 'debug', label: 'Debug', icon: REGISTERED_ICONS.debug || 'debug' },
  //{ id: 'reward', label: 'Reward (Dev)', icon: REGISTERED_ICONS.reward || 'reward' }, // <-- [DEV PREVIEW: delete when done]
  { id: 'config', label: 'Config', icon: '' },
  { id: 'marketplace', label: 'Marketplace', icon: '' },
  { id: 'calendar', label: 'Calendar', icon: '' },
  { id: 'fridge', label: 'Fridge', icon: '' },
  { id: 'closet', label: 'Closet', icon: '' },
];

export interface MenuBarOptions {
  items?: MenuItemConfig[];
  coins?: number;
  onItemClick?: (id: string) => void;
  onStateChange?: (isOpen: boolean) => void;
}

export class MenuBarComponent {
  private container: HTMLElement;
  private items: MenuItemConfig[];
  private coins = 0;
  private isOpen = false;
  private activeOptionId: string | null = null;

  private onItemClick?: (id: string) => void;
  private onStateChange?: (isOpen: boolean) => void;

  constructor(container: HTMLElement, options?: MenuBarOptions) {
    this.container = container;
    this.items = options?.items || DEFAULT_MENU_ITEMS;
    this.coins = typeof options?.coins === 'number' ? options.coins : 0;
    this.onItemClick = options?.onItemClick;
    this.onStateChange = options?.onStateChange;

    // Preload icons into memory cache
    preloadAllRegisteredIcons();

    this.render();
  }

  public render(): void {
    this.container.innerHTML = `
      <div class="menu-bar-panel">
        <div class="menu-bar-header">
          <span class="menu-bar-title">CLEO</span>
          <div class="menu-bar-coins" id="menu-bar-coins" title="Coins: ${this.coins}">
            <span class="menu-bar-coin-icon">${renderIconHtml(REGISTERED_ICONS.coin || 'coin', 'coin-icon-img', 'Coins')}</span>
            <span class="menu-bar-coin-amount" id="menu-bar-coin-amount">${this.coins}</span>
          </div>
        </div>
        <div class="menu-bar-list">
          ${this.items
        .map(
          (item) => `
            <button class="menu-item-btn ${this.activeOptionId === item.id ? 'active' : ''}" data-id="${item.id}" title="${item.label}">
              <span class="menu-item-icon">${renderIconHtml(item.icon, 'menu-icon-img', item.label)}</span>
              <span class="menu-item-label">${item.label}</span>
            </button>
          `
        )
        .join('')}
        </div>
      </div>
    `;

    // Attach click handlers to menu buttons
    const buttons = this.container.querySelectorAll('.menu-item-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.id;
        if (id) {
          console.log(`[MenuBar] Clicked item: ${id}`);
          if (this.onItemClick) {
            this.onItemClick(id);
          }
        }
      });
    });
  }

  public toggle(): boolean {
    this.isOpen = !this.isOpen;
    if (!this.isOpen) {
      this.setActiveOption(null);
    }
    this.updateVisibility();
    return this.isOpen;
  }

  public open(): void {
    if (!this.isOpen) {
      this.isOpen = true;
      this.setActiveOption(null);
      this.updateVisibility();
    }
  }

  public close(): void {
    if (this.isOpen) {
      this.isOpen = false;
      this.setActiveOption(null);
      this.updateVisibility();
    }
  }

  public getIsOpen(): boolean {
    return this.isOpen;
  }

  public setActiveOption(id: string | null): void {
    this.activeOptionId = id;
    const buttons = this.container.querySelectorAll('.menu-item-btn');
    buttons.forEach((btn) => {
      const btnId = (btn as HTMLElement).dataset.id;
      if (btnId === id) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  public getActiveOption(): string | null {
    return this.activeOptionId;
  }

  private updateVisibility(): void {
    if (this.isOpen) {
      this.container.classList.add('visible');
    } else {
      this.container.classList.remove('visible');
    }
    if (this.onStateChange) {
      this.onStateChange(this.isOpen);
    }
  }

  public setItems(newItems: MenuItemConfig[]): void {
    this.items = newItems;
    this.render();
  }

  public setCoins(coins: number): void {
    this.coins = typeof coins === 'number' ? Math.max(0, Math.floor(coins)) : 0;
    const coinContainer = this.container.querySelector('#menu-bar-coins');
    const amountEl = this.container.querySelector('#menu-bar-coin-amount');
    if (amountEl) {
      amountEl.textContent = String(this.coins);
    }
    if (coinContainer) {
      coinContainer.setAttribute('title', `Coins: ${this.coins}`);
    }
  }

  public getCoins(): number {
    return this.coins;
  }
}

