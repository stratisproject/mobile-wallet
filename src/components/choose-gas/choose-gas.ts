import { Component, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Slides } from 'ionic-angular';
import * as _ from 'lodash';
import { Coin } from '../../providers/currency/currency';
import { ExternalLinkProvider } from '../../providers/external-link/external-link';
import { FeeProvider } from '../../providers/fee/fee';
import { Logger } from '../../providers/logger/logger';
import { ActionSheetParent } from '../action-sheet/action-sheet-parent';

@Component({
  selector: 'page-choose-gas',
  templateUrl: 'choose-gas.html'
})
export class ChooseGasComponent extends ActionSheetParent {
  @ViewChild('feeSlides')
  feeSlides: Slides;

  public network: string;
  public coin: Coin;
  public showMaxWarning: boolean;
  public showMinWarning: boolean;
  public okText: string;
  public cancelText: string;

  private GAS_PRICE_MIN = 100;
  private GAS_PRICE_MAX = 10000;
  private GAS_LIMIT_MIN = 10000;
  private GAS_LIMIT_MAX = 250000;

  public customGasPrice: number;
  public customGasLimit: number;

  public gasPriceError: boolean;
  public gasLimitError: boolean;

  constructor(
    private logger: Logger,
    public feeProvider: FeeProvider,
    private translate: TranslateService,
    private externalLinkProvider: ExternalLinkProvider
  ) {
    super();
  }

  ngOnInit() {
    this.okText = this.translate.instant('Ok');
    this.cancelText = this.translate.instant('Cancel');

    // From parent controller
    this.network = this.params.network;
    this.coin = this.params.coin;
    this.customGasPrice = this.params.gasPrice;
    this.customGasLimit = this.params.gasLimit;
  }

  public checkGasPrice(): void {
    this.gasPriceError = this.customGasPrice < this.GAS_PRICE_MIN || this.customGasPrice > this.GAS_PRICE_MAX ? true : false;    
  }

  public checkGasLimit(): void {
    this.gasLimitError = this.customGasLimit < this.GAS_LIMIT_MIN || this.customGasLimit > this.GAS_LIMIT_MAX ? true : false;
  }

  public changeSelectedFee(): void {
    this.logger.debug('New gas price: ' + this.customGasPrice);
    this.logger.debug('New gas limit: ' + this.customGasLimit);

    this.dismiss({
      newGasPrice: this.customGasPrice,
      newGasLimit: this.customGasLimit
    });
  }

  public openExternalLink(url: string): void {
    this.externalLinkProvider.open(url);
  }
}
