import { BwcProvider } from '../../providers/bwc/bwc';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { Events, ModalController, NavController, NavParams } from 'ionic-angular';
import { Logger } from '../../providers/logger/logger';

// providers
import { ConfigProvider } from '../../providers/config/config';
import { ProfileProvider } from '../../providers/profile/profile';
import { ReplaceParametersProvider } from '../../providers/replace-parameters/replace-parameters';
import { KeyProvider } from '../../providers/key/key';
import { FinishModalPage } from '../finish/finish';
import { BwcErrorProvider, ErrorsProvider } from '../../providers';

@Component({
  selector: 'page-sign-message',
  templateUrl: 'sign-message.html'
})
export class SignMessagePage {
  public wallet;
  public walletName: string;
  public privKey: string;

  public walletNameForm: FormGroup;
  public description: string;

  private config;
  signedMessage: any;
  public address: any;
  xPrivKey: any;

  constructor(
    private profileProvider: ProfileProvider,
    private navCtrl: NavController,
    private navParams: NavParams,
    private configProvider: ConfigProvider,
    private formBuilder: FormBuilder,
    private logger: Logger,
    private translate: TranslateService,
    private bwcProvider: BwcProvider,
    private keyProvider: KeyProvider,
    protected errorsProvider: ErrorsProvider,
    protected modalCtrl: ModalController,
    private bwcErrorProvider: BwcErrorProvider
  ) {
    this.walletName = this.navParams.data.walletName;

    this.walletNameForm = this.formBuilder.group({
      walletName: [
        '',
        Validators.compose([Validators.minLength(1), Validators.required])
      ]
    });
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: SignMessagePage');
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
  }

  async signMessage() {
    let bitcore = this.wallet.coin == 'crs' ? this.bwcProvider.getBitcoreCirrus() : this.bwcProvider.getBitcoreStrax();
    let message = this.walletNameForm.value.walletName;
    let bcMessage = new bitcore.Message(message);

    const signMessage = (xPrivKey: any, path: string) => {
      const privKey = new bitcore.HDPrivateKey(xPrivKey).deriveChild(this.wallet.credentials.rootPath).deriveChild(path).privateKey;

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

    if (this.xPrivKey == null) {
      try {
        let password = await this.keyProvider.handleEncryptedWallet(this.wallet.keyId);
        const key = this.keyProvider.get(this.wallet.keyId, password);
        this.xPrivKey = key.xPrivKey;
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
    }

    signMessage(this.xPrivKey, this.address.path);
  };

  private showErrorInfoSheet(
    err: Error | string,
    infoSheetTitle: string
  ): void {
    if (!err) return;
    this.logger.error('Could not get keys:', err);
    this.errorsProvider.showDefaultError(err, infoSheetTitle);
  }
}
