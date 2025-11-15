export interface ActiveAlarm {
  id: string;
  source: string;
  severity: "low" | "medium" | "high";
  remaining: number;
  duration: number;
}

export class AlarmController {
  private readonly alarms: ActiveAlarm[] = [];
  private counter = 0;

  trigger(source: string, severity: ActiveAlarm["severity"], duration: number): ActiveAlarm {
    const alarm: ActiveAlarm = {
      id: `alarm_${this.counter += 1}`,
      source,
      severity,
      remaining: duration,
      duration
    };
    this.alarms.push(alarm);
    return alarm;
  }

  update(delta: number): void {
    for (let i = this.alarms.length - 1; i >= 0; i -= 1) {
      const alarm = this.alarms[i];
      alarm.remaining -= delta;
      if (alarm.remaining <= 0) {
        this.alarms.splice(i, 1);
      }
    }
  }

  getActiveAlarms(): ActiveAlarm[] {
    return this.alarms;
  }

  hasActiveAlarm(): boolean {
    return this.alarms.length > 0;
  }
}
