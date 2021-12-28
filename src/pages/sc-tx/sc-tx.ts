import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Events, NavController, NavParams } from 'ionic-angular';
import { Logger } from '../../providers/logger/logger';

// providers
import { ConfigProvider } from '../../providers/config/config';
import { ProfileProvider } from '../../providers/profile/profile';
import { ScanPage } from '../scan/scan';
import { ErrorsProvider, PlatformProvider, TxFormatProvider } from '../../providers';
import { ConfirmScPage } from '../send/confirm-sc/confirm-sc';
import { QrCodePayload } from 'calldataserializer';
import _ from 'lodash';

@Component({
  selector: 'page-sc-tx',
  templateUrl: 'sc-tx.html'
})
export class ScTxPage {
  public wallet;

  // Base64 encoded tx data
  public get txData() {
     return this.txDataString;
  }

  public txDataString: string = JSON.stringify({
    to: "tCzkmt5BPJVQHqtygbboc9qhLxbGGAruHQ",
    method: "Deposit",
    amount: "50000000", // SATS
    parameters: [],
    callback: "https://enjrxoquzz7e.x.pipedream.net/"
  } as QrCodePayload);
   
  public privKey: string;

  public scTxDataForm: FormGroup;
  public description: string;

  public config;
  signedMessage: any;

  constructor(
    private profileProvider: ProfileProvider,
    private navCtrl: NavController,
    private navParams: NavParams,
    private configProvider: ConfigProvider,
    private formBuilder: FormBuilder,
    private events: Events,
    private logger: Logger,
    private platformProvider: PlatformProvider,
    private errorsProvider: ErrorsProvider,
    private txFormatProvider: TxFormatProvider
  ) {
    this.scTxDataForm = this.formBuilder.group({
      txData: ['']
    });
    
    this.wallet = this.profileProvider.getWallet(this.navParams.data.walletId);
    this.config = this.configProvider.get();
    this.events.subscribe('Local/ScTx', this.updateScTxDataHandler);
  }
  
  ionViewDidLoad() {
    this.logger.info('Loaded: ScTxPage');
    if(this.platformProvider.isCordova) {
      this.openScanner();
    }
  }
 
  ngOnDestroy() {
    this.events.unsubscribe('Local/ScTx', this.updateScTxDataHandler);
  }

  private updateScTxDataHandler: any = (data: { value: string }) => {
    this.logger.info('ScTx: updateScTxDataHandler called');

    this.logger.info(data);
    this.txDataString = data.value;

    if(this.validateInput()) { 
      let qrcodeData = JSON.parse(data.value) as QrCodePayload;
      
      this.navCtrl.push(ConfirmScPage, {
        walletId: this.wallet.credentials.walletId,
        message: qrcodeData
      });
    }
  };

  private instanceOfQrCodeParameters(parameters: []) {
    return Array.isArray(parameters) && parameters.every(p => this.instanceOfQrCodeParameter(p));
  }

  private instanceOfQrCodeParameter(data: any) {
    return 'label' in data
      && 'value' in data;
  }

  private instanceOfQrCodePayload(data: any) {
    return 'to' in data
      && 'amount' in data
      && 'method' in data
      && 'parameters' in data
      && 'callback' in data
      && this.instanceOfQrCodeParameters(data.parameters);
  }

  private validateInput() {
    try {
      let result = JSON.parse(this.txDataString);

      if(!this.instanceOfQrCodePayload(result)) {
        throw new Error("Not a correctly formatted QR code");
      }

      return true;
    }
    catch (e) {
      this.errorsProvider.showDefaultError(
        e,
        "Unreadable scan",
        () => {
          this.logger.error("Scanned SC json was invalid");
        }
      );

      return false;
    }

    return false;
  }

  public openScanner(): void {
    this.navCtrl.push(ScanPage, { fromScTx: true });
  }

  jsonTxData() {
    return JSON.stringify(this.txData);
  }

  broadcastSignedMessage() {
    this.events.publish('Local/ScTx', { value: this.txDataString });
  }
}
