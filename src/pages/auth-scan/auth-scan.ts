import { BwcProvider } from '../../providers/bwc/bwc';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { Events, NavController, NavParams } from 'ionic-angular';
import { Logger } from '../../providers/logger/logger';

// providers
import { ConfigProvider } from '../../providers/config/config';
import { ProfileProvider } from '../../providers/profile/profile';
import { ReplaceParametersProvider } from '../../providers/replace-parameters/replace-parameters';
import { KeyProvider } from '../../providers/key/key';
import { ErrorsProvider, PlatformProvider } from '../../providers';
import { ScanPage } from '../scan/scan';
import { ConfirmAuthPage } from '../send/confirm-auth/confirm-auth';
import { Url } from 'url';

export interface AuthData {
  url: Url,
  expiry: Date,
  messageToSign: string,
  callbackUrl: string
}

/*
Opens the scanner, reads a QR and passes the raw data to the confirmation page.

*/
@Component({
  selector: 'page-auth-scan',
  templateUrl: 'auth-scan.html'
})
export class AuthScanPage {
  public wallet;
  public walletName: string;
  public privKey: string;

  public walletNameForm: FormGroup;
  public description: string;

  private config;
  signedMessage: any;
  xPrivKey: any;
  public address: any;

  constructor(
    private profileProvider: ProfileProvider,
    private navCtrl: NavController,
    private navParams: NavParams,
    private configProvider: ConfigProvider,
    private formBuilder: FormBuilder,
    private events: Events,
    private logger: Logger,
    private replaceParametersProvider: ReplaceParametersProvider,
    private translate: TranslateService,
    private bwcProvider: BwcProvider,
    private keyProvider: KeyProvider,
    private platformProvider: PlatformProvider,
    private errorsProvider: ErrorsProvider
  ) {
    this.events.subscribe('Local/AuthScan', this.handleAuth);

    this.walletName = "sid:api.example.com/auth?uid=4606287adc774829ab643816a021efbf&exp=1647216000";

    this.walletNameForm = this.formBuilder.group({
      walletName: [
        '',
        Validators.compose([Validators.minLength(1), Validators.required])
      ]
    });
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: AuthScanPage');

    if(this.platformProvider.isCordova) {
      this.openScanner();
    }
  }

  ionViewWillEnter() {
    this.wallet = this.profileProvider.getWallet(this.navParams.data.walletId);
    this.address = this.navParams.data.address;
    this.config = this.configProvider.get();
    let alias =
      this.config.aliasFor &&
      this.config.aliasFor[this.wallet.credentials.walletId];
    this.walletNameForm.value.walletName = alias
      ? alias
      : this.wallet.credentials.walletName;
    this.walletName = this.wallet.credentials.walletName;
    this.description = this.replaceParametersProvider.replace(
      this.translate.instant(
        'When this wallet was created, it was called "{{walletName}}". You can change the name displayed on this device below.'
      ),
      { walletName: this.walletName }
    );

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
  
  public openScanner(): void {
    this.navCtrl.push(ScanPage, { fromAuthScan: true }, { animate: false });
  }

  handleAuth(data: string) {
    let loginData = this.parseInput(data);
    
    if(loginData == null)
      return;

    this.navCtrl.push(ConfirmAuthPage, {
      message: loginData,
      walletId: this.navParams.data.walletId
    });
  }

  sign() {
    this.handleAuth(this.walletNameForm.value.walletName);
  }

  private parseInput(message: string) {
    try {
      let url = new URL(message);

      console.log(url);
      let parsed = this.parseUrl(url);
      console.log(parsed);
    }
    catch (e) {
      this.errorsProvider.showDefaultError(
        e,
        "Unreadable scan",
        () => {
          this.logger.error("Scanned auth URI was invalid")
              this.navCtrl.pop();
        }
      );
      return null;
    }
  }

  private parseUrl(url: URL): AuthData {
    let exp = url.searchParams.get("exp");
    let expiry = new Date(+exp* 1000); // Expiry is unix time, JS date is scaled by 1000 
    
    return {
      url,
      expiry,
      messageToSign: url.href.replace(url.protocol, ""),
      callbackUrl: url.href.replace(url.protocol, "https://")
    } as AuthData;
  }

  signMessage() {
    let bitcore = this.wallet.coin == 'crs' ? this.bwcProvider.getBitcoreCirrus() : this.bwcProvider.getBitcoreStrax();
    let message = this.walletNameForm.value.walletName;
    this.parseInput(message);
    let bcMessage = new bitcore.Message(message);

    const signMessage = (path: string) => {
      const privKey = new bitcore.HDPrivateKey(this.xPrivKey).deriveChild(this.wallet.credentials.rootPath).deriveChild(path).privateKey;

      let ecdsa = bitcore.crypto.ECDSA().set({
        hashbuf: bcMessage.magicHash(),
        privkey: privKey
      });    
      ecdsa.sign()
      ecdsa.calci();
      
      let sig = ecdsa.sig;
      let sigBytes = sig.toCompact();
      this.signedMessage = sigBytes.toString('base64');
    }

    signMessage(this.address.path);
  };
}
