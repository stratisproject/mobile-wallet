import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Events, NavController, NavParams } from 'ionic-angular';
import { Logger } from '../../providers/logger/logger';

// providers
import { ConfigProvider } from '../../providers/config/config';
import { ProfileProvider } from '../../providers/profile/profile';
import { ScanPage } from '../scan/scan';
import { ErrorsProvider, PlatformProvider } from '../../providers';
import { ConfirmScPage } from '../send/confirm-sc/confirm-sc';
import { QrCodePayload } from 'calldataserializer';

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
    private errorsProvider: ErrorsProvider
  ) {
    this.events.subscribe('Local/ScTx', this.updateScTxDataHandler);

    this.scTxDataForm = this.formBuilder.group({
      txData: [
        '',
        Validators.compose([Validators.minLength(1), Validators.required])
      ]
    });
  }

  private updateScTxDataHandler: any = data => {
    this.logger.info('ScTx: updateScTxDataHandler called');
    this.logger.info(data);
    this.txDataString = data.value;
    this.validateInput();
    this.broadcastSignedMessage();
  };

  private validateInput() {
    try {
      JSON.parse(this.txDataString);
    }
    catch (e) {
      this.errorsProvider.showDefaultError(
        e,
        "Unreadable scan",
        () => {
          this.logger.error("Scanned SC json was invalid")
              this.navCtrl.pop();
        }
      );
    }
  }

  public openScanner(): void {
    this.navCtrl.push(ScanPage, { fromScTx: true }, { animate: false });
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: ScTxPage');
    if(this.platformProvider.isCordova) {
      this.openScanner();
    }
  }

  ionViewWillEnter() {
    this.wallet = this.profileProvider.getWallet(this.navParams.data.walletId);
    this.config = this.configProvider.get();
  }

  jsonTxData() {
    return JSON.stringify(this.txData);
  }

  broadcastSignedMessage() {
    this.validateInput();

    let data = JSON.parse(this.txDataString) as QrCodePayload;
    
    // TODO finish this
    this.navCtrl.push(ConfirmScPage, {
      toAddress: data.to,
      amount: data.amount,
      walletId: this.wallet.credentials.walletId,
      scData: data,
      coin: this.wallet.coin,
      network: this.wallet.network,
      useSendMax: false,
    });
  }
}
