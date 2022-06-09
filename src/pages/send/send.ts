import { Component, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Events, NavController, NavParams, Platform } from 'ionic-angular';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';
import { Observable } from 'rxjs/Observable';

// Providers
import { ActionSheetProvider } from '../../providers/action-sheet/action-sheet';
import { AddressProvider } from '../../providers/address/address';
import { AppProvider } from '../../providers/app/app';
import { BwcErrorProvider } from '../../providers/bwc-error/bwc-error';
import { ClipboardProvider } from '../../providers/clipboard/clipboard';
import { Coin, CurrencyProvider } from '../../providers/currency/currency';
import { ErrorsProvider } from '../../providers/errors/errors';
import { IncomingDataProvider } from '../../providers/incoming-data/incoming-data';
import { Logger } from '../../providers/logger/logger';
import { OnGoingProcessProvider } from '../../providers/on-going-process/on-going-process';
import { PayproProvider } from '../../providers/paypro/paypro';

// Pages
import { CopayersPage } from '../add/copayers/copayers';
import { ImportWalletPage } from '../add/import-wallet/import-wallet';
import { JoinWalletPage } from '../add/join-wallet/join-wallet';
import { BitPayCardIntroPage } from '../integrations/bitpay-card/bitpay-card-intro/bitpay-card-intro';
import { CoinbasePage } from '../integrations/coinbase/coinbase';
import { SelectInvoicePage } from '../integrations/invoice/select-invoice/select-invoice';
import { SimplexPage } from '../integrations/simplex/simplex';
import { PaperWalletPage } from '../paper-wallet/paper-wallet';
import { ScanPage } from '../scan/scan';
import { AmountPage } from '../send/amount/amount';
import { ConfirmPage } from '../send/confirm/confirm';
import { SelectInputsPage } from '../send/select-inputs/select-inputs';
import { AddressbookAddPage } from '../settings/addressbook/add/add';
import { WalletDetailsPage } from '../wallet-details/wallet-details';
import { MultiSendPage } from './multi-send/multi-send';

@Component({
  selector: 'page-send',
  templateUrl: 'send.html'
})
export class SendPage {
  public wallet: any;
  public search: string = '';
  public invalidAddress: boolean;
  public validDataFromClipboard;
  public transferToChain: string = '';
  public federation: string;
  private onResumeSubscription: Subscription;
  private validDataTypeMap: string[] = [
    'BitcoinAddress',
    'BitcoinCashAddress',
    'EthereumAddress',
    'EthereumUri',
    'RippleAddress',
    'DogecoinAddress',
    'RippleUri',
    'BitcoinUri',
    'BitcoinCashUri',
    'DogecoinUri',
    'BitPayUri',
    'StraxUri',
    'StraxAddress',
    'CirrusUri',
    'CirrusAddress'
  ];
  private pageMap = {
    AddressbookAddPage,
    AmountPage,
    BitPayCardIntroPage,
    CoinbasePage,
    ConfirmPage,
    CopayersPage,
    ImportWalletPage,
    JoinWalletPage,
    PaperWalletPage,
    SimplexPage,
    SelectInvoicePage,
    WalletDetailsPage
  };
  private federationMap = {
    crs: {
      livenet: 'yU2jNwiac7XF8rQvSk2bgibmwsNLkkhsHV',
      testnet: 'tGWegFbA6e6QKZP7Pe3g16kFVXMghbSfY8'
    },
    strax: {
      livenet: 'cYTNBJDbgjRgcKARAvi2UCSsDdyHkjUqJ2',
      testnet: 'xHtgXLa3CSjAVtmydqNrrMU7nZw7qdq2w6'
    }
  }

  constructor(
    private currencyProvider: CurrencyProvider,
    private navCtrl: NavController,
    private navParams: NavParams,
    private payproProvider: PayproProvider,
    private logger: Logger,
    private incomingDataProvider: IncomingDataProvider,
    private addressProvider: AddressProvider,
    private events: Events,
    private actionSheetProvider: ActionSheetProvider,
    private appProvider: AppProvider,
    private translate: TranslateService,
    private errorsProvider: ErrorsProvider,
    private onGoingProcessProvider: OnGoingProcessProvider,
    private bwcErrorProvider: BwcErrorProvider,
    private plt: Platform,
    private clipboardProvider: ClipboardProvider
  ) {
    this.wallet = this.navParams.data.wallet;
    this.events.subscribe('Local/AddressScan', this.updateAddressHandler);
    this.events.subscribe('SendPageRedir', this.SendPageRedirEventHandler);
    this.events.subscribe('Desktop/onFocus', () => {
      this.setDataFromClipboard();
    });
    this.onResumeSubscription = this.plt.resume.subscribe(() => {
      this.setDataFromClipboard();
    });
  }

  @ViewChild('transferTo')
  transferTo;

  ionViewDidLoad() {
    if (this.isCrsOrStraxCoin()) {
      this.transferToChain = this.wallet.coin;
    }

    this.logger.info('Loaded: SendPage');
  }

  ionViewDidEnter() {
    this.setDataFromClipboard();
  }

  ngOnDestroy() {
    this.events.unsubscribe('Local/AddressScan', this.updateAddressHandler);
    this.events.unsubscribe('SendPageRedir', this.SendPageRedirEventHandler);
    this.events.unsubscribe('Desktop/onFocus');
    this.onResumeSubscription.unsubscribe();
  }

  private async setDataFromClipboard() {
    this.validDataFromClipboard = await this.clipboardProvider.getValidData(
      this.wallet.coin
    );
  }

  private SendPageRedirEventHandler: any = nextView => {
    const currentIndex = this.navCtrl.getActive().index;
    const currentView = this.navCtrl.getViews();
    nextView.params.fromWalletDetails = true;
    nextView.params.walletId = this.wallet.credentials.walletId;
    this.navCtrl
      .push(this.pageMap[nextView.name], nextView.params, { animate: false })
      .then(() => {
        if (currentView[currentIndex].name == 'ScanPage')
          this.navCtrl.remove(currentIndex);
      });
  };

  private updateAddressHandler: any = data => {
    this.search = data.value;
    this.processInput();
  };

  public shouldShowZeroState() {
    return (
      this.wallet &&
      this.wallet.cachedStatus &&
      !this.wallet.cachedStatus.totalBalanceSat
    );
  }

  public openScanner(): void {
    this.navCtrl.push(ScanPage, { fromSend: true }, { animate: false });
  }

  public showOptions(coin: Coin) {
    return (
      (this.currencyProvider.isMultiSend(coin) ||
        this.currencyProvider.isUtxoCoin(coin)) &&
      !this.shouldShowZeroState()
    );
  }

  public checkTransferToChain(): void {
    if (this.search) {
      const parsedData = this.incomingDataProvider.parseData(this.search);
      const validDataType = _.indexOf(this.validDataTypeMap, parsedData.type) != -1;

      if (parsedData && validDataType) {
        this.checkCoinAndNetwork(this.search)
      }
    }
  }

  public isCrsOrStraxCoin() {
    return this.wallet.coin === Coin.CRS ||
           this.wallet.coin === Coin.STRAX;
  }

  private checkCoinAndNetwork(data, isPayPro?): boolean {
    let isValid, addrData;
    let chain = this.currencyProvider.getChain(this.wallet.coin);

    if (isPayPro) {
      isValid =
        data &&
        data.chain == chain &&
        data.network == this.wallet.network;
    } else {
      addrData = this.addressProvider.getCoinAndNetwork(data, this.wallet.network);
      chain = chain.toLowerCase();

      if (this.isCrsOrStraxCoin()) {
        const isCrossChain = (
          chain === Coin.CRS && addrData.coin === Coin.STRAX ||
          chain === Coin.STRAX && addrData.coin === Coin.CRS
        );

        isValid =
          (chain === addrData.coin || isCrossChain) &&
          addrData.network === this.wallet.network &&
          addrData.coin === this.transferToChain;

        this.federation = isValid && isCrossChain
          ? this.federationMap[addrData.coin][addrData.network]
          : undefined;
      } else {
        isValid = chain == addrData.coin && addrData.network == this.wallet.network;
      }
    }

    if (isValid) {
      this.invalidAddress = false;
      return true;
    } else {
      this.invalidAddress = true;
      let network = isPayPro ? data.network : addrData.network;

      if (this.wallet.coin === 'bch' && this.wallet.network === network) {
        const isLegacy = this.checkIfLegacy();
        isLegacy ? this.showLegacyAddrMessage() : this.showErrorMessage();
      } else {
        this.showErrorMessage();
      }
    }

    return false;
  }

  private redir() {
    this.incomingDataProvider.redir(this.federation || this.search, {
      activePage: 'SendPage',
      amount: this.navParams.data.amount,
      coin: this.navParams.data.coin, // TODO ???? what is this for ?
      opReturn: !!this.federation ? this.search : undefined
    });
    this.search = '';
    this.transferToChain = '';
  }

  private showErrorMessage() {
    const msg = this.translate.instant(
      'The wallet you are using does not match the network and/or the currency of the address provided'
    );
    const title = this.translate.instant('Error');
    this.errorsProvider.showDefaultError(msg, title, () => {
      this.search = '';
    });
  }

  private showLegacyAddrMessage() {
    const appName = this.appProvider.info.nameCase;
    const infoSheet = this.actionSheetProvider.createInfoSheet(
      'legacy-address-info',
      { appName }
    );
    infoSheet.present();
    infoSheet.onDidDismiss(option => {
      if (option) {
        const legacyAddr = this.search;
        const cashAddr = this.addressProvider.translateToCashAddress(
          legacyAddr
        );
        this.search = cashAddr;
        this.processInput();
      }
    });
  }

  public cleanSearch() {
    this.search = '';
    this.invalidAddress = false;
  }

  public async processInput() {
    if (this.search == '') this.invalidAddress = false;
    const hasContacts = await this.checkIfContact();
    if (!hasContacts) {
      const parsedData = this.incomingDataProvider.parseData(this.search);
      if (
        (parsedData && parsedData.type == 'PayPro') ||
        (parsedData && parsedData.type == 'InvoiceUri')
      ) {
        try {
          const invoiceUrl = this.incomingDataProvider.getPayProUrl(
            this.search
          );
          const payproOptions = await this.payproProvider.getPayProOptions(
            invoiceUrl
          );
          const selected = payproOptions.paymentOptions.find(
            option =>
              option.selected &&
              this.wallet.coin.toUpperCase() === option.currency
          );
          if (selected) {
            const activePage = 'SendPage';
            const isValid = this.checkCoinAndNetwork(selected, true);
            if (isValid) {
              this.incomingDataProvider.goToPayPro(
                payproOptions.payProUrl,
                this.wallet.coin,
                undefined,
                true,
                activePage
              );
            }
          } else {
            this.redir();
          }
        } catch (err) {
          this.onGoingProcessProvider.clear();
          this.invalidAddress = true;
          this.logger.warn(this.bwcErrorProvider.msg(err));
          this.errorsProvider.showDefaultError(
            this.bwcErrorProvider.msg(err),
            this.translate.instant('Error')
          );
        }
      } else if (
        parsedData &&
        _.indexOf(this.validDataTypeMap, parsedData.type) != -1
      ) {
        if (this.isCrsOrStraxCoin()) {
          const addressData = this.addressProvider.getCoinAndNetwork(this.search, this.wallet.network)
          this.transferToChain = addressData.coin;
        }

        if (this.checkCoinAndNetwork(this.search)) {
          this.redir();
        }
      } else if (parsedData && parsedData.type == 'BitPayCard') {
        // this.close();
        this.incomingDataProvider.redir(this.search, {
          activePage: 'SendPage'
        });
      } else if (parsedData && parsedData.type == 'PrivateKey') {
        this.incomingDataProvider.redir(this.search, {
          activePage: 'SendPage'
        });
      } else {
        this.invalidAddress = true;
      }
    } else {
      this.invalidAddress = false;
    }
  }

  public async checkIfContact() {
    await Observable.timer(50).toPromise();
    return this.transferTo.hasContactsOrWallets;
  }

  private checkIfLegacy(): boolean {
    return (
      this.incomingDataProvider.isValidBitcoinCashLegacyAddress(this.search) ||
      this.incomingDataProvider.isValidBitcoinCashUriWithLegacyAddress(
        this.search
      )
    );
  }

  public showMoreOptions(): void {
    const optionsSheet = this.actionSheetProvider.createOptionsSheet(
      'send-options',
      {
        isUtxoCoin: this.currencyProvider.isUtxoCoin(this.wallet.coin),
        isMultiSend: this.currencyProvider.isMultiSend(this.wallet.coin)
      }
    );
    optionsSheet.present();

    optionsSheet.onDidDismiss(option => {
      if (option == 'multi-send')
        this.navCtrl.push(MultiSendPage, {
          wallet: this.wallet
        });
      if (option == 'select-inputs')
        this.navCtrl.push(SelectInputsPage, {
          wallet: this.wallet
        });
    });
  }

  public pasteFromClipboard() {
    this.search = this.validDataFromClipboard || '';
    this.validDataFromClipboard = null;
    this.clipboardProvider.clear();
    this.processInput();
  }
}
