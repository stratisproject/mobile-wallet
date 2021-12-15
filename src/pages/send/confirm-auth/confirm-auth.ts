import { Component, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  App,
  Events,
  ModalController,
  NavController,
  NavParams
} from 'ionic-angular';
import * as _ from 'lodash';
import { AuthData } from '../../../pages/auth-scan/auth-scan';
import { KeyProvider } from '../../../providers';

// Providers
import { ActionSheetProvider } from '../../../providers/action-sheet/action-sheet';
import { AddressProvider } from '../../../providers/address/address';
import { AnalyticsProvider } from '../../../providers/analytics/analytics';
import { AppProvider } from '../../../providers/app/app';
import { BwcErrorProvider } from '../../../providers/bwc-error/bwc-error';
import { BwcProvider } from '../../../providers/bwc/bwc';
import { ClipboardProvider } from '../../../providers/clipboard/clipboard';
import { CoinbaseProvider } from '../../../providers/coinbase/coinbase';
import { CurrencyProvider } from '../../../providers/currency/currency';
import { ErrorsProvider } from '../../../providers/errors/errors';
import { ExternalLinkProvider } from '../../../providers/external-link/external-link';
import { FeeProvider } from '../../../providers/fee/fee';
import { HomeIntegrationsProvider } from '../../../providers/home-integrations/home-integrations';
import { Logger } from '../../../providers/logger/logger';
import { OnGoingProcessProvider } from '../../../providers/on-going-process/on-going-process';
import { PayproProvider } from '../../../providers/paypro/paypro';
import { PersistenceProvider } from '../../../providers/persistence/persistence';
import { PlatformProvider } from '../../../providers/platform/platform';
import { PopupProvider } from '../../../providers/popup/popup';
import { ProfileProvider } from '../../../providers/profile/profile';
import { RateProvider } from '../../../providers/rate/rate';
import { ReplaceParametersProvider } from '../../../providers/replace-parameters/replace-parameters';
import { TxConfirmNotificationProvider } from '../../../providers/tx-confirm-notification/tx-confirm-notification';
import { TxFormatProvider } from '../../../providers/tx-format/tx-format';
import {
  WalletProvider
} from '../../../providers/wallet/wallet';
import { parseDomain, ParseResultType } from "parse-domain";
import { Url } from 'url';
import { FinishModalPage } from '../../../pages/finish/finish';
import { ScanPage } from '../../../pages/scan/scan';

export const KNOWN_URL_DOMAINS = [
  "example.com",
  "opdex.com"
];

@Component({
  selector: 'page-confirm-auth',
  templateUrl: 'confirm-auth.html'
})
export class ConfirmAuthPage {

  @ViewChild('slideButton')
  slideButton;
  showMultiplesOutputs: boolean;
  hideSlideButton: boolean;
  isCordova: boolean;
  wallet: any;
  isOpenSelector: boolean;
  coin: any;
  mainTitle: any;
  message: AuthData;
  signingAddress: any;
  knownHostname: boolean;
  broadcasting: boolean;

  constructor(
    protected addressProvider: AddressProvider,
    protected analyticsProvider: AnalyticsProvider,
    protected app: App,
    protected actionSheetProvider: ActionSheetProvider,
    protected bwcErrorProvider: BwcErrorProvider,
    protected bwcProvider: BwcProvider,
    protected currencyProvider: CurrencyProvider,
    protected errorsProvider: ErrorsProvider,
    protected externalLinkProvider: ExternalLinkProvider,
    protected feeProvider: FeeProvider,
    protected logger: Logger,
    protected modalCtrl: ModalController,
    protected navCtrl: NavController,
    protected navParams: NavParams,
    protected onGoingProcessProvider: OnGoingProcessProvider,
    protected platformProvider: PlatformProvider,
    protected profileProvider: ProfileProvider,
    protected popupProvider: PopupProvider,
    protected replaceParametersProvider: ReplaceParametersProvider,
    protected rateProvider: RateProvider,
    protected translate: TranslateService,
    protected txConfirmNotificationProvider: TxConfirmNotificationProvider,
    protected txFormatProvider: TxFormatProvider,
    protected walletProvider: WalletProvider,
    protected clipboardProvider: ClipboardProvider,
    protected events: Events,
    protected coinbaseProvider: CoinbaseProvider,
    protected appProvider: AppProvider,
    protected payproProvider: PayproProvider,
    protected homeIntegrationsProvider: HomeIntegrationsProvider,
    protected persistenceProvider: PersistenceProvider,
    private keyProvider: KeyProvider
  ) {
    this.wallet = this.profileProvider.getWallet(this.navParams.data.walletId);
    this.isCordova = this.platformProvider.isCordova;
    this.hideSlideButton = false;
    this.showMultiplesOutputs = false;
  }
  
  ngOnInit() {
    
  }

  ionViewWillEnter() {
    this.wallet = this.profileProvider.getWallet(this.navParams.data.walletId);
    this.message = this.navParams.data.message;
    this.signingAddress = this.navParams.data.signingAddress;

    // If it's invalid we can't use it at all for some reason.
    let callbackHostname = this.getHostName(this.message.callbackUrl);
    this.knownHostname = callbackHostname != null 
      ? KNOWN_URL_DOMAINS.indexOf(callbackHostname) !== -1
      : false;
  }

  getHostName(callbackUrl: Url): string {
    let parsedDomain = parseDomain(callbackUrl.hostname);

    switch (parsedDomain.type) {
      case ParseResultType.Listed:
        return [parsedDomain.domain, ...parsedDomain.topLevelDomains].join(".");
      case ParseResultType.NotListed:
      case ParseResultType.Ip:
        case ParseResultType.Reserved:
        return parsedDomain.hostname;    
      case ParseResultType.Invalid:
      default:
        return null;
    }

  }

  ionViewWillLeave() {
    this.navCtrl.swipeBackEnabled = true;
  }

  ngOnDestroy() {
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: ConfirmAuthPage');
    this.navCtrl.swipeBackEnabled = false;
    this.coin = this.navParams.data.coin;
    this.setTitle();
  }

  private setTitle(): void {
    this.mainTitle = this.translate.instant('Confirm Authorization Message Signing');
  }

  async signAndBroadcastLogin() {

    let xPrivKey;

    try {
      let password = await this.keyProvider.handleEncryptedWallet(this.wallet.keyId);
      const key = this.keyProvider.get(this.wallet.keyId, password);
      xPrivKey = key.xPrivKey;
    }
    catch(err){
      if (err && err.message != 'PASSWORD_CANCELLED') {
        if (err.message == 'WRONG_PASSWORD') {
          this.errorsProvider.showWrongEncryptPasswordError();
        } else {
          let title = this.translate.instant('Could not decrypt wallet');
          this.showErrorInfoSheet(this.bwcErrorProvider.msg(err), title);
        }
      }
      return;
    };

    let signedMessage = this.signMessage(this.message.messageToSign, xPrivKey);

    try {
      this.broadcasting = true;
      await this.walletProvider.callbackAuthURL(this.wallet, { callbackUrl: this.message.callbackUrl.href, publicKey: this.signingAddress.address, signature: signedMessage} );
      this.broadcasting = false;
      
      await this.openFinishModal();
    } catch {
      this.broadcasting = false;
      await this.openFinishErrorModal();
    }
  }

  signMessage(message: string, xPrivKey: string): string {
    let bitcore = this.wallet.coin == 'crs' ? this.bwcProvider.getBitcoreCirrus() : this.bwcProvider.getBitcoreStrax();
    let bcMessage = new bitcore.Message(message);

    const signMessage = (path: string) => {
      const privKey = new bitcore.HDPrivateKey(xPrivKey).deriveChild(this.wallet.credentials.rootPath).deriveChild(path).privateKey;

      let ecdsa = bitcore.crypto.ECDSA().set({
        hashbuf: bcMessage.magicHash(),
        privkey: privKey
      });    
      ecdsa.sign()
      ecdsa.calci();
      
      let sig = ecdsa.sig;
      let sigBytes = sig.toCompact();
      return sigBytes.toString('base64');
    }

    return signMessage(this.signingAddress.path);
  };


  private async openFinishModal() {
    let params: {
      finishText: string;
      finishComment?: string;
      autoDismiss?: boolean;
      coin: string;
    } = {
      finishText: "Login message signed and broadcast!",
      autoDismiss: false,
      coin: this.coin
    };

    const modal = this.modalCtrl.create(FinishModalPage, params, {
      showBackdrop: true,
      enableBackdropDismiss: false,
      cssClass: 'finish-modal'
    });

    await modal.present();

    this.navCtrl.popToRoot();
  }

  private async openFinishErrorModal() {
    let params: {
      finishText: string;
      finishComment?: string;
      autoDismiss?: boolean;
      coin: string;
      cssClass: string;
    } = {
      finishText: "Error broadcasting login message, please try again.",
      autoDismiss: false,
      coin: this.coin,
      cssClass: 'danger'
    };

    const modal = this.modalCtrl.create(FinishModalPage, params, {
      showBackdrop: true,
      enableBackdropDismiss: false
    });

    await modal.present();

    this.navCtrl.popToRoot();
  }

  private showErrorInfoSheet(
    err: Error | string,
    infoSheetTitle: string
  ): void {
    if (!err) return;
    this.logger.error('Could not get keys:', err);
    this.errorsProvider.showDefaultError(err, infoSheetTitle);
  }
}
