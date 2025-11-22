import type { Player } from "../entities/Player";
import { resolveItemDefinition, createStack } from "../inventory/Item";
import { WeaponModPanel } from "../ui/WeaponModPanel";
import { CombatController } from "./CombatController";
import { UnifiedOverlay } from "../ui/UnifiedOverlay";

export class WeaponModController {
  private readonly panel: WeaponModPanel;
  private isOpen = false;

  constructor(
    private readonly player: Player,
    private readonly combat: CombatController,
    private readonly overlay: UnifiedOverlay
  ) {
    this.panel = new WeaponModPanel({
      onAttach: (slot, attachmentId) => this.installAttachment(slot, attachmentId),
      onDetach: slot => this.detachAttachment(slot),
      onDisassemble: () => this.handleDisassemble(),
      onClose: () => this.close()
    });

    this.overlay.registerTab({
      id: "weapons",
      label: "Weapons",
      icon: "\uD83D\uDD2B",
      hotkeys: ["toggle-weapon-mods"],
      element: this.panel.getElement(),
      onOpen: () => this.open(),
      onClose: () => this.close(true)
    });
  }

  update(): void {
    if (!this.isOpen) {
      return;
    }
    const weapon = this.combat.getEquippedWeapon();
    if (!weapon) {
      this.panel.render({ weaponName: null, slots: [], canDisassemble: false });
      this.panel.setMessage("Equip a weapon to customize");
      return;
    }
    const slots = (weapon.definition.attachments ?? []).map(slot => {
      const attachedId = weapon.stack.attachments?.[slot] ?? null;
      const attachedDefinition = attachedId ? resolveItemDefinition(attachedId) : null;
      return {
        slot,
        attachedLabel: attachedDefinition?.name ?? null,
        attachedId,
        options: this.getAttachmentOptions(slot)
      };
    });
    this.panel.render({
      weaponName: weapon.definition.name,
      slots,
      canDisassemble: Boolean(weapon.definition.disassembly_yield?.length)
    });
  }

  private open(): void {
    this.isOpen = true;
    this.player.lockMovement("weapon-mods");
    this.update();
    this.panel.setMessage("Select an attachment slot to install or detach mods.");
  }

  private close(triggeredByOverlay = false): void {
    if (!this.isOpen) {
      return;
    }
    this.isOpen = false;
    this.player.unlockMovement("weapon-mods");
    if (!triggeredByOverlay) {
      this.overlay.hide();
    }
  }

  private getAttachmentOptions(slot: string): { itemId: string; label: string }[] {
    const counts = new Map<string, { label: string; qty: number }>();
    this.player.inventory.getPlacedItems().forEach(item => {
      if (item.definition.attachment_slot !== slot) {
        return;
      }
      const entry = counts.get(item.stack.itemId) ?? { label: item.definition.name, qty: 0 };
      entry.qty += item.stack.quantity;
      counts.set(item.stack.itemId, entry);
    });
    return [...counts.entries()].map(([itemId, data]) => ({
      itemId,
      label: `${data.label} (x${data.qty})`
    }));
  }

  private installAttachment(slot: string, attachmentId: string | null): void {
    const weapon = this.combat.getEquippedWeapon();
    if (!weapon) {
      this.panel.setMessage("No weapon selected");
      return;
    }
    if (!attachmentId) {
      this.panel.setMessage("Pick an attachment before installing");
      return;
    }
    if (weapon.stack.attachments?.[slot]) {
      this.panel.setMessage("Detach the existing attachment first");
      return;
    }
    const definition = resolveItemDefinition(attachmentId);
    if (definition.attachment_slot !== slot) {
      this.panel.setMessage("Attachment does not fit this slot");
      return;
    }
    const consumed = this.player.inventory.consumeItems([{ itemId: attachmentId, quantity: 1 }]);
    if (!consumed) {
      this.panel.setMessage("Attachment missing from inventory");
      return;
    }
    if (!weapon.stack.attachments) {
      weapon.stack.attachments = {};
    }
    weapon.stack.attachments[slot] = attachmentId;
    this.combat.notifyAttachmentsChanged(weapon.id);
    this.panel.setMessage(`Installed ${definition.name}`);
    this.update();
  }

  private detachAttachment(slot: string): void {
    const weapon = this.combat.getEquippedWeapon();
    if (!weapon || !weapon.stack.attachments?.[slot]) {
      this.panel.setMessage("No attachment to remove");
      return;
    }
    const attachmentId = weapon.stack.attachments[slot];
    const added = this.player.inventory.add(createStack(attachmentId, 1));
    if (added.accepted === 0) {
      this.panel.setMessage("Backpack full – make space first");
      return;
    }
    if (!added.success) {
      this.panel.setMessage("Partial space available – attachment remained installed");
      return;
    }
    delete weapon.stack.attachments[slot];
    if (weapon.stack.attachments && !Object.keys(weapon.stack.attachments).length) {
      delete weapon.stack.attachments;
    }
    this.combat.notifyAttachmentsChanged(weapon.id);
    const definition = resolveItemDefinition(attachmentId);
    this.panel.setMessage(`Detached ${definition.name}`);
    this.update();
  }

  private handleDisassemble(): void {
    const success = this.combat.disassembleEquippedWeapon();
    if (success) {
      this.panel.setMessage("Weapon dismantled");
      this.close();
    } else {
      this.panel.setMessage("Unable to disassemble weapon – check HUD message");
    }
  }
}
