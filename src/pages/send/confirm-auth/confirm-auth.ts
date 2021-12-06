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
import { AuthData } from 'src/pages/auth-scan/auth-scan';
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
import { ConfigProvider } from '../../../providers/config/config';
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

export const KNOWN_URL_DOMAINS = [
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
  xPrivKey: string;
  signingAddress: string;
  expired: any;

  constructor(
    protected addressProvider: AddressProvider,
    protected analyticsProvider: AnalyticsProvider,
    protected app: App,
    protected actionSheetProvider: ActionSheetProvider,
    protected bwcErrorProvider: BwcErrorProvider,
    protected bwcProvider: BwcProvider,
    protected configProvider: ConfigProvider,
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

    this.keyProvider
    .handleEncryptedWallet(this.wallet.keyId)
    .then((password: string) => {
      const key = this.keyProvider.get(this.wallet.keyId, password);
      this.xPrivKey = key.xPrivKey; 
    })
    .catch(err => {
      // TODO handle this properly
      console.log(err);
      this.navCtrl.pop();
    });
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
    this.mainTitle = this.translate.instant('Sign Authorization Message');
  }

  signAndBroadcastLogin() {

  }
}
