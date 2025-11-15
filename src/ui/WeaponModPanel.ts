type AttachHandler = (slot: string, attachmentId: string | null) => void;
type SlotActionHandler = (slot: string) => void;
type SimpleHandler = () => void;

export interface WeaponModPanelSlotState {
  slot: string;
  attachedLabel: string | null;
  attachedId: string | null;
  options: { itemId: string; label: string }[];
}

export interface WeaponModPanelState {
  weaponName: string | null;
  slots: WeaponModPanelSlotState[];
  canDisassemble: boolean;
}

interface WeaponModPanelOptions {
  onAttach: AttachHandler;
  onDetach: SlotActionHandler;
  onDisassemble: SimpleHandler;
  onClose: SimpleHandler;
}

export class WeaponModPanel {
  private readonly container: HTMLDivElement;
  private readonly header: HTMLHeadingElement;
  private readonly slotContainer: HTMLDivElement;
  private readonly footer: HTMLDivElement;
  private readonly message: HTMLParagraphElement;
  private state: WeaponModPanelState = { weaponName: null, slots: [], canDisassemble: false };

  constructor(private readonly options: WeaponModPanelOptions) {
    this.container = document.createElement("div");
    this.container.className = "weapon-mod-panel hidden";
    this.header = document.createElement("h3");
    this.header.className = "weapon-mod-panel__title";
    this.slotContainer = document.createElement("div");
    this.slotContainer.className = "weapon-mod-panel__slots";
    this.footer = document.createElement("div");
    this.footer.className = "weapon-mod-panel__footer";
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "weapon-mod-panel__close";
    closeButton.innerText = "Close (T)";
    closeButton.addEventListener("click", () => this.options.onClose());
    const disassembleButton = document.createElement("button");
    disassembleButton.type = "button";
    disassembleButton.className = "weapon-mod-panel__disassemble";
    disassembleButton.innerText = "Disassemble";
    disassembleButton.addEventListener("click", () => this.options.onDisassemble());
    this.footer.append(disassembleButton, closeButton);
    this.message = document.createElement("p");
    this.message.className = "weapon-mod-panel__message";
    this.container.append(this.header, this.slotContainer, this.footer, this.message);
    document.body.append(this.container);
  }

  show(): void {
    this.container.classList.remove("hidden");
  }

  hide(): void {
    this.container.classList.add("hidden");
  }

  render(state: WeaponModPanelState): void {
    this.state = state;
    this.header.innerText = state.weaponName ? `Modding ${state.weaponName}` : "No weapon equipped";
    this.slotContainer.innerHTML = "";
    if (!state.weaponName) {
      const empty = document.createElement("p");
      empty.innerText = "Equip a firearm or melee weapon to install attachments.";
      this.slotContainer.append(empty);
    } else if (!state.slots.length) {
      const none = document.createElement("p");
      none.innerText = "This weapon has no attachment slots.";
      this.slotContainer.append(none);
    } else {
      state.slots.forEach(slot => {
        const row = document.createElement("div");
        row.className = "weapon-mod-panel__slot";
        const label = document.createElement("div");
        label.className = "weapon-mod-panel__slot-label";
        label.innerText = slot.slot.toUpperCase();
        const status = document.createElement("div");
        status.className = "weapon-mod-panel__slot-status";
        status.innerText = slot.attachedLabel ? `Installed: ${slot.attachedLabel}` : "Empty";
        const controls = document.createElement("div");
        controls.className = "weapon-mod-panel__slot-controls";
        const select = document.createElement("select");
        select.disabled = Boolean(slot.attachedId || !slot.options.length);
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.innerText = slot.options.length ? "Choose attachment" : "No mods in pack";
        select.append(placeholder);
        slot.options.forEach(option => {
          const optionEl = document.createElement("option");
          optionEl.value = option.itemId;
          optionEl.innerText = option.label;
          select.append(optionEl);
        });
        const attachButton = document.createElement("button");
        attachButton.type = "button";
        attachButton.innerText = "Install";
        attachButton.disabled = Boolean(slot.attachedId) || !slot.options.length;
        attachButton.addEventListener("click", () => {
          const value = select.value || null;
          this.options.onAttach(slot.slot, value);
        });
        const detachButton = document.createElement("button");
        detachButton.type = "button";
        detachButton.innerText = "Detach";
        detachButton.disabled = !slot.attachedId;
        detachButton.addEventListener("click", () => this.options.onDetach(slot.slot));
        controls.append(select, attachButton, detachButton);
        row.append(label, status, controls);
        this.slotContainer.append(row);
      });
    }
    const disassembleButton = this.footer.querySelector<HTMLButtonElement>(".weapon-mod-panel__disassemble");
    if (disassembleButton) {
      disassembleButton.disabled = !state.canDisassemble;
    }
  }

  setMessage(text: string): void {
    this.message.innerText = text;
  }
}
