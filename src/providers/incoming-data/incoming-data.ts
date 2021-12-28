import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Events } from 'ionic-angular';
import * as _ from 'lodash';

// providers
import { ActionSheetProvider } from '../action-sheet/action-sheet';
import { AnalyticsProvider } from '../analytics/analytics';
import { AppProvider } from '../app/app';
import { BitPayIdProvider } from '../bitpay-id/bitpay-id';
import { BwcProvider } from '../bwc/bwc';
import { Coin, CurrencyProvider } from '../currency/currency';
import { ExternalLinkProvider } from '../external-link/external-link';
import { IABCardProvider } from '../in-app-browser/card';
import { Logger } from '../logger/logger';
import { OnGoingProcessProvider } from '../on-going-process/on-going-process';
import { PayproProvider } from '../paypro/paypro';
import { PersistenceProvider } from '../persistence/persistence';
import { ProfileProvider } from '../profile/profile';

export interface RedirParams {
  activePage?: any;
  amount?: string;
  coin?: Coin;
  fromHomeCard?: boolean;
}

@Injectable()
export class IncomingDataProvider {
  private activePage: string;

  constructor(
    private actionSheetProvider: ActionSheetProvider,
    private events: Events,
    private bwcProvider: BwcProvider,
    private currencyProvider: CurrencyProvider,
    private payproProvider: PayproProvider,
    private logger: Logger,
    private translate: TranslateService,
    private profileProvider: ProfileProvider,
    private onGoingProcessProvider: OnGoingProcessProvider
  ) {
    this.logger.debug('IncomingDataProvider initialized');
  }

  public showMenu(data): void {
    const dataMenu = this.actionSheetProvider.createIncomingDataMenu({ data });
    dataMenu.present();
    dataMenu.onDidDismiss(data => this.finishIncomingData(data));
  }

  public finishIncomingData(data: any): void {
    let nextView = {};
    if (data) {
      const stateParams = {
        addressbookEntry:
          data.redirTo == 'AddressbookAddPage' ? data.value : null,
        toAddress: data.redirTo == 'AmountPage' ? data.value : null,
        coin: data.coin ? data.coin : 'btc',
        privateKey: data.redirTo == 'PaperWalletPage' ? data.value : null
      };
      nextView = {
        name: data.redirTo,
        params: stateParams
      };
    }
    this.incomingDataRedir(nextView);
  }

  private isValidStraxUri(data: string): boolean {
    data = this.sanitizeUri(data);
    return !!this.bwcProvider.getBitcoreStrax().URI.isValid(data);
  }

  private isValidCirrusUri(data: string): boolean {
    data = this.sanitizeUri(data);
    return !!this.bwcProvider.getBitcoreCirrus().URI.isValid(data);
  }

  public isValidBitcoinCashUriWithLegacyAddress(data: string): boolean {
    data = this.sanitizeUri(data);
    return !!this.bwcProvider
      .getBitcore()
      .URI.isValid(data.replace(/^(bitcoincash:|bchtest:)/, 'bitcoin:'));
  }

  public isValidBitcoinCashLegacyAddress(data: string): boolean {
    return !!(
      this.bwcProvider.getBitcore().Address.isValid(data, 'livenet') ||
      this.bwcProvider.getBitcore().Address.isValid(data, 'testnet')
    );
  }

  private isValidStraxAddress(data: string): boolean {
    return !!(
      this.bwcProvider.getBitcoreStrax().Address.isValid(data, 'livenet') ||
      this.bwcProvider.getBitcoreStrax().Address.isValid(data, 'testnet')
    );
  }

  private isValidCirrusAddress(data: string): boolean {
    return !!(
      this.bwcProvider.getBitcoreCirrus().Address.isValid(data, 'livenet') ||
      this.bwcProvider.getBitcoreCirrus().Address.isValid(data, 'testnet')
    );
  }

  private isValidJoinCode(data: string): boolean {
    data = this.sanitizeUri(data);
    return !!(data && data.match(/^copay:[0-9A-HJ-NP-Za-km-z]{70,80}$/));
  }

  private isValidJoinLegacyCode(data: string): boolean {
    return !!(data && data.match(/^[0-9A-HJ-NP-Za-km-z]{70,80}$/));
  }

  private isValidPrivateKey(data: string): boolean {
    return !!(
      data &&
      (data.substring(0, 2) == '6P' || this.checkPrivateKey(data))
    );
  }

  private isValidImportPrivateKey(data: string): boolean {
    return !!(
      data &&
      (data.substring(0, 2) == '1|' ||
        data.substring(0, 2) == '2|' ||
        data.substring(0, 2) == '3|')
    );
  }

  private handlePrivateKey(data: string, redirParams?: RedirParams): void {
    this.logger.debug('Incoming-data: private key');
    this.showMenu({
      data,
      type: 'privateKey',
      fromHomeCard: redirParams ? redirParams.fromHomeCard : false
    });
  }

  private handleStraxUri(data: string, redirParams?: RedirParams): void {
    this.logger.debug('Incoming-data: Strax URI');
    let amountFromRedirParams =
      redirParams && redirParams.amount ? redirParams.amount : '';
    const coin = Coin.STRAX;
    let parsed = this.bwcProvider.getBitcoreStrax().URI(data);
    let address = parsed.address ? parsed.address.toString() : '';
    let message = parsed.message;
    let amount = parsed.amount || amountFromRedirParams;
    this.goSend(address, amount, message, coin);
  }

  private handleCirrusUri(data: string, redirParams?: RedirParams): void {
    this.logger.debug('Incoming-data: Cirrus URI');
    let amountFromRedirParams =
      redirParams && redirParams.amount ? redirParams.amount : '';
    const coin = Coin.CRS;
    let parsed = this.bwcProvider.getBitcoreCirrus().URI(data);
    let address = parsed.address ? parsed.address.toString() : '';
    let message = parsed.message;
    let amount = parsed.amount || amountFromRedirParams;
    this.goSend(address, amount, message, coin);
  }

  private handlePlainCirrusAddress(
    data: string,
    redirParams?: RedirParams
  ): void {
    this.logger.debug('Incoming-data: Cirrus plain address');
    const coin = Coin.CRS;
    if (redirParams && redirParams.activePage === 'ScanPage') {
      this.showMenu({
        data,
        type: 'bitcoinAddress',
        coin
      });
    } else if (redirParams && redirParams.amount) {
      this.goSend(data, redirParams.amount, '', coin);
    } else {
      this.goToAmountPage(data, coin);
    }
  }

  private handlePlainStraxAddress(
    data: string,
    redirParams?: RedirParams
  ): void {
    this.logger.debug('Incoming-data: Bitcoin plain address');
    const coin = Coin.STRAX;
    if (redirParams && redirParams.activePage === 'ScanPage') {
      this.showMenu({
        data,
        type: 'bitcoinAddress',
        coin
      });
    } else if (redirParams && redirParams.amount) {
      this.goSend(data, redirParams.amount, '', coin);
    } else {
      this.goToAmountPage(data, coin);
    }
  }

  private goToImportByPrivateKey(data: string): void {
    this.logger.debug('Incoming-data (redirect): QR code export feature');

    let stateParams = { code: data };
    let nextView = {
      name: 'ImportWalletPage',
      params: stateParams
    };
    this.incomingDataRedir(nextView);
  }

  private goToJoinWallet(data: string): void {
    this.logger.debug('Incoming-data (redirect): Code to join to a wallet');
    let nextView, stateParams;

    const opts = {
      showHidden: true,
      canAddNewAccount: true
    };
    const wallets = this.profileProvider.getWallets(opts);
    const nrKeys = _.values(_.groupBy(wallets, 'keyId')).length;

    if (nrKeys === 0) {
      stateParams = { url: data };
      nextView = {
        name: 'JoinWalletPage',
        params: stateParams
      };
    } else if (nrKeys != 1) {
      stateParams = { url: data, isJoin: true };
      nextView = {
        name: 'AddWalletPage',
        params: stateParams
      };
    } else if (nrKeys === 1) {
      stateParams = { keyId: wallets[0].credentials.keyId, url: data };
      nextView = {
        name: 'JoinWalletPage',
        params: stateParams
      };
    }

    if (this.isValidJoinCode(data) || this.isValidJoinLegacyCode(data)) {
      this.incomingDataRedir(nextView);
    } else {
      this.logger.error('Incoming-data: Invalid code to join to a wallet');
    }
  }

  public redir(data: string, redirParams?: RedirParams): boolean {
    if (redirParams && redirParams.activePage) {
      this.activePage = redirParams.activePage;
    }

    // Strax address
    if (this.isValidStraxAddress(data)) {
      this.handlePlainStraxAddress(data, redirParams);
      return true;
    } 
    
    // Cirrus address
    if (this.isValidCirrusAddress(data)) {
      this.handlePlainCirrusAddress(data, redirParams);
      return true;
    }

    // Strax URI
    if (this.isValidStraxUri(data)) {
      this.handleStraxUri(data, redirParams);
      return true;
    } 

    // Cirrus URI
    if (this.isValidCirrusUri(data)) {
      this.handleCirrusUri(data, redirParams);
      return true;
    } 

    if (this.isValidJoinCode(data) || this.isValidJoinLegacyCode(data)) {
      this.goToJoinWallet(data);
      return true; 
    }

    // Check Private Key    
    if (this.isValidPrivateKey(data)) {
      this.handlePrivateKey(data, redirParams);
      return true;
    }

    // Import Private Key
    if (this.isValidImportPrivateKey(data)) {
      this.goToImportByPrivateKey(data);
      return true;
    }

    if (redirParams && redirParams.activePage === 'ScanPage') {
      this.logger.debug('Incoming-data: Plain text');
      this.showMenu({
        data,
        type: 'text'
      });
      return true;
    }

    this.logger.warn('Incoming-data: Unknown information');
    return false;    
  }

  public parseData(data: string): any {
    if (!data) return;

    if (this.isValidStraxAddress(data)) {
      return {
        data,
        type: 'StraxAddress',
        title: this.translate.instant('Strax Address')
      };
    } 
    
    if (this.isValidCirrusAddress(data)) {
      return {
        data,
        type: 'CirrusAddress',
        title: this.translate.instant('Cirrus Address')
      };
    } 

    // Join
    if (this.isValidJoinCode(data) || this.isValidJoinLegacyCode(data)) {
      return {
        data,
        type: 'JoinWallet',
        title: this.translate.instant('Invitation Code')
      };
    } 
    
    // Check Private Key
    if (this.isValidPrivateKey(data)) {
      return {
        data,
        type: 'PrivateKey',
        title: this.translate.instant('Private Key')
      };    
    }

    // Import Private Key
    if (this.isValidImportPrivateKey(data)) {
      return {
        data,
        type: 'ImportPrivateKey',
        title: this.translate.instant('Import Words')
      };
    } 
    
    // Anything else
  }

  public extractAddress(data: string): string {
    const address = data.replace(/^[a-z]+:/i, '').replace(/\?.*/, '');
    const params = /([\?\&]+[a-z]+=(\d+([\,\.]\d+)?))+/i;
    return address.replace(params, '');
  }

  private sanitizeUri(data): string {
    // Fixes when a region uses comma to separate decimals
    let regex = /[\?\&]amount=(\d+([\,\.]\d+)?)/i;
    let match = regex.exec(data);
    if (!match || match.length === 0) {
      return data;
    }
    let value = match[0].replace(',', '.');
    let newUri = data.replace(regex, value);

    // mobile devices, uris like copay://xxx
    newUri.replace('://', ':');

    return newUri;
  }

  public getPayProUrl(data: string): string {
    return decodeURIComponent(
      data.replace(/(bitcoin|bitcoincash|ethereum|ripple|dogecoin)?:\?r=/, '')
    );
  }

  public getParameterByName(name: string, url: string): string {
    if (!url) return undefined;
    name = name.replace(/[\[\]]/g, '\\$&');
    let regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
      results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
  }

  private checkPrivateKey(privateKey: string): boolean {
    // Check if it is a Transaction id to prevent errors
    let isPK: boolean = this.checkRegex(privateKey);
    if (!isPK) return false;
    try {
      this.bwcProvider.getBitcore().PrivateKey(privateKey, 'livenet');
    } catch (err) {
      return false;
    }
    return true;
  }

  private checkRegex(data: string): boolean {
    let PKregex = new RegExp(/^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/);
    return !!PKregex.exec(data);
  }

  private goSend(
    addr: string,
    amount: string,
    message: string,
    coin: Coin,
    requiredFeeRate?: string,
    destinationTag?: string
  ): void {
    if (amount) {
      let stateParams = {
        amount,
        toAddress: addr,
        description: message,
        coin,
        requiredFeeRate,
        destinationTag
      };
      let nextView = {
        name: 'ConfirmPage',
        params: stateParams
      };
      this.incomingDataRedir(nextView);
    } else {
      let stateParams = {
        toAddress: addr,
        description: message,
        coin
      };
      let nextView = {
        name: 'AmountPage',
        params: stateParams
      };
      this.incomingDataRedir(nextView);
    }
  }

  private goToAmountPage(toAddress: string, coin: Coin): void {
    let stateParams = {
      toAddress,
      coin
    };
    let nextView = {
      name: 'AmountPage',
      params: stateParams
    };

    this.incomingDataRedir(nextView);
  }

  public goToPayPro(
    url: string,
    coin: Coin,
    payProOptions?,
    disableLoader?: boolean,
    activePage?: string
  ): void {
    if (activePage) this.activePage = activePage;
    this.payproProvider
      .getPayProDetails({ paymentUrl: url, coin, disableLoader })
      .then(details => {
        this.onGoingProcessProvider.clear();
        this.handlePayPro(details, payProOptions, url, coin);
      })
      .catch(err => {
        this.onGoingProcessProvider.clear();
        this.events.publish('incomingDataError', err);
        this.logger.error(err);
      });
  }

  private async handlePayPro(
    payProDetails,
    payProOptions,
    url,
    coin: Coin
  ): Promise<void> {
    if (!payProDetails) {
      this.logger.error('No wallets available');
      const error = this.translate.instant('No wallets available');
      this.events.publish('incomingDataError', error);
      return;
    }

    let invoiceID;
    let requiredFeeRate;

    if (payProDetails.requiredFeeRate) {
      requiredFeeRate = !this.currencyProvider.isUtxoCoin(coin)
        ? payProDetails.requiredFeeRate
        : Math.ceil(payProDetails.requiredFeeRate * 1000);
    }

    try {
      const { memo, network } = payProDetails;
      if (!payProOptions) {
        payProOptions = await this.payproProvider.getPayProOptions(url);
      }
      const paymentOptions = payProOptions.paymentOptions;
      const { estimatedAmount, minerFee } = paymentOptions.find(
        option => option.currency.toLowerCase() === coin
      );
      const instructions = payProDetails.instructions[0];
      const { toAddress, data } = instructions;
      
      const stateParams = {
        amount: estimatedAmount,
        toAddress,
        description: memo,
        data,
        invoiceID,
        paypro: payProDetails,
        coin,
        network,
        payProUrl: url,
        requiredFeeRate,
        minerFee // needed for payments with Coinbase accounts
      };
      const nextView = {
        name: 'ConfirmPage',
        params: stateParams
      };
      this.incomingDataRedir(nextView);
    } catch (err) {
      this.events.publish('incomingDataError', err);
      this.logger.error(err);
    }
  }

  private incomingDataRedir(nextView) {
    if (this.activePage === 'SendPage') {
      this.events.publish('SendPageRedir', nextView);
    } else {
      this.events.publish('IncomingDataRedir', nextView);
    }
  }
}
