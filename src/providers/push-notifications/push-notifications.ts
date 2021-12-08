import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Events, Toast, ToastController } from 'ionic-angular';
import { Observable } from 'rxjs';
import { Logger } from '../../providers/logger/logger';

// providers
import { AppProvider } from '../app/app';
import { BwcProvider } from '../bwc/bwc';
import { ConfigProvider } from '../config/config';
import { PlatformProvider } from '../platform/platform';
import { ProfileProvider } from '../profile/profile';

import * as _ from 'lodash';

@Injectable()
export class PushNotificationsProvider {
  private isIOS: boolean;
  private isAndroid: boolean;
  private usePushNotifications: boolean;
  private _token = null;
  private fcmInterval;
  private toasts = [];
  private currentToast: Toast;
  private openWalletId;

  constructor(
    public http: HttpClient,
    public profileProvider: ProfileProvider,
    public platformProvider: PlatformProvider,
    public configProvider: ConfigProvider,
    public logger: Logger,
    public appProvider: AppProvider,
    private bwcProvider: BwcProvider,
    private events: Events,
    private toastCtrl: ToastController,
    private translate: TranslateService
  ) {
    this.logger.debug('PushNotificationsProvider initialized');
    this.isIOS = this.platformProvider.isIOS;
    this.isAndroid = this.platformProvider.isAndroid;
    this.usePushNotifications = this.platformProvider.isCordova;
  }

  public init(): void {
    if (!this.usePushNotifications || this._token) return;
    this.configProvider.load().then(() => {
      const config = this.configProvider.get();
      if (!config.pushNotifications.enabled) return;
    });
  }

  public handlePushNotifications(): void {
    if (this.usePushNotifications) {
    }
  }

  public updateSubscription(walletClient): void {
    if (!this._token) {
      this.logger.warn(
        'Push notifications disabled for this device. Nothing to do here.'
      );
      return;
    }
    if (!_.isArray(walletClient)) walletClient = [walletClient];
    walletClient.forEach(w => {
      this._subscribe(w);
    });
  }

  public enable(): void {
    if (!this._token) {
      this.logger.warn(
        'No token available for this device. Cannot set push notifications. Needs registration.'
      );
      return;
    }

    const opts = {
      showHidden: false
    };
    const wallets = this.profileProvider.getWallets(opts);
    _.forEach(wallets, walletClient => {
      this._subscribe(walletClient);
    });
  }

  public disable(): void {
    if (!this._token) {
      this.logger.warn(
        'No token available for this device. Cannot disable push notifications.'
      );
      return;
    }

    // disabling topics
    this.unsubscribeFromTopic();
    this.unsubscribeFromTopic();

    const opts = {
      showHidden: true
    };
    const wallets = this.profileProvider.getWallets(opts);
    _.forEach(wallets, walletClient => {
      this._unsubscribe(walletClient);
    });
    this._token = null;

    clearInterval(this.fcmInterval);
  }

  public unsubscribe(walletClient): void {
    if (!this._token) return;
    this._unsubscribe(walletClient);
  }

  public subscribeToTopic(): void {
  }

  public unsubscribeFromTopic(): void {
  }

  private _subscribe(walletClient): void {
    const opts = {
      token: this._token,
      platform: this.isIOS ? 'ios' : this.isAndroid ? 'android' : null,
      packageName: this.appProvider.info.packageNameId,
      walletId: walletClient.credentials.walletId
    };
    walletClient.pushNotificationsSubscribe(opts, err => {
      if (err)
        this.logger.error(
          walletClient.name + ': Subscription Push Notifications error. ',
          err.message
        );
      else
        this.logger.debug(
          walletClient.name + ': Subscription Push Notifications success.'
        );
    });
  }

  private _unsubscribe(walletClient): void {
    walletClient.pushNotificationsUnsubscribe(this._token, err => {
      if (err)
        this.logger.error(
          walletClient.name + ': Unsubscription Push Notifications error. ',
          err.message
        );
      else
        this.logger.debug(
          walletClient.name + ': Unsubscription Push Notifications Success.'
        );
    });
  }

  private async _openWallet(data) {
    const walletIdHashed = data.walletId;
    const tokenAddress = data.tokenAddress;
    const multisigContractAddress = data.multisigContractAddress;
    if (!walletIdHashed) return;

    const wallet = this.findWallet(
      walletIdHashed,
      tokenAddress,
      multisigContractAddress
    );

    if (!wallet || this.openWalletId === wallet.credentials.walletId) return;

    this.openWalletId = wallet.credentials.walletId; // avoid opening the same wallet many times

    await Observable.timer(1000).toPromise(); // wait for subscription to OpenWallet event

    this.events.publish('OpenWallet', wallet);
  }

  private findWallet(walletIdHashed, tokenAddress, multisigContractAddress?) {
    let walletIdHash;
    const sjcl = this.bwcProvider.getSJCL();

    const wallets = this.profileProvider.getWallets();
    const wallet = _.find(wallets, w => {
      if (tokenAddress || multisigContractAddress) {
        const walletId = w.credentials.walletId;
        const lastHyphenPosition = walletId.lastIndexOf('-');
        const walletIdWithoutTokenAddress = walletId.substring(
          0,
          lastHyphenPosition
        );
        walletIdHash = sjcl.hash.sha256.hash(walletIdWithoutTokenAddress);
      } else {
        walletIdHash = sjcl.hash.sha256.hash(w.credentials.walletId);
      }
      return _.isEqual(walletIdHashed, sjcl.codec.hex.fromBits(walletIdHash));
    });

    return wallet;
  }

  public clearAllNotifications(): void {
  }

  private runToastQueue() {
    if (this.currentToast) return;

    this.toasts.some(data => {
      if (!data.showDone) {
        this.currentToast = this.toastCtrl.create({
          message: `${data.title}\n${data.body}`,
          duration: 5000,
          position: 'top',
          showCloseButton: true,
          closeButtonText: this.translate.instant('Open Wallet'),
          cssClass: 'toast-bg'
        });

        this.currentToast.onDidDismiss((_opt, role) => {
          if (role === 'close') this._openWallet(data);

          this.currentToast = null;
          this.runToastQueue();
        });

        this.currentToast.present();
        data.showDone = true;
        return true;
      }

      return false;
    });
  }
}
