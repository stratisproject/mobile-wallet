import { Injectable } from '@angular/core';

@Injectable()
export class AnalyticsProvider {
  constructor() {}
  logEvent(eventName: string, eventParams: { [key: string]: any }) {
    console.log(eventName, eventParams);
  }
  setUserProperty(name: string, value: string) {
    console.log(name, value);
  }
}
