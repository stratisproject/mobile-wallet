import { Injectable } from '@angular/core';
import { Events } from 'ionic-angular';

import { IncomingDataProvider } from '../incoming-data/incoming-data';
import { Logger } from '../logger/logger';
import { PlatformProvider } from '../platform/platform';

@Injectable()
export class DynamicLinksProvider {
  constructor(
    private logger: Logger,
    private events: Events,
    private incomingDataProvider: IncomingDataProvider,
    private platformProvider: PlatformProvider
  ) {
    this.logger.debug('DynamicLinksProvider initialized');
  }

  async init() {
    let dynLink;
    dynLink = this.platformProvider.isIOS
      ? await this.onDynamicLink()
      : await this.getDynamicLink();
    this.logger.debug('Firebase Dynamic Link Data: ', JSON.stringify(dynLink));
    if (dynLink && dynLink.deepLink) this.processDeepLink(dynLink.deepLink);
  }

  private getDynamicLink(): Promise<any> {
    return null;
  }

  private onDynamicLink(): Promise<any> {
    return null;
  }

  createDynamicLink(): Promise<any> {
    return null;
  }

  processDeepLink(deepLink: string) {
    const view =
      this.incomingDataProvider.getParameterByName('view', deepLink) ||
      'DynamicLink';
    const stateParams = { deepLink: true };
    const nextView = {
      name: view,
      params: stateParams
    };
    this.events.publish('IncomingDataRedir', nextView);
  }
}
