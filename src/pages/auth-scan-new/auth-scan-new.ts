import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
} from '@angular/forms';
import { Events, NavController } from 'ionic-angular';

// providers
import { AppProvider } from '../../providers/app/app';
import { Logger } from '../../providers/logger/logger';

// validators
import { ScanPage } from '../scan/scan';

@Component({
  selector: 'page-auth-scan-new',
  templateUrl: 'auth-scan-new.html'
})
export class AuthScanNewPage {
  public addressBookAdd: FormGroup;

  public isCordova: boolean;
  public appName: string;
  data: any;

  constructor(
    private navCtrl: NavController,
    private events: Events,
    private appProvider: AppProvider,
    private formBuilder: FormBuilder,
    private logger: Logger,
  ) {
    this.addressBookAdd = this.formBuilder.group({
      name: [
        ''
      ],
    });
    
    this.appName = this.appProvider.info.nameCase;
    this.events.subscribe('Local/AddressScan', this.updateAddressHandler);
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: AuthScanNew');
  }

  ngOnDestroy() {
    this.events.unsubscribe('Local/AddressScan', this.updateAddressHandler);
  }

  private updateAddressHandler: any = data => {
    this.logger.info("AuthScanNew: received data");
    this.logger.info(data);

    this.data = data.value;

    this.addressBookAdd.controls['name'].setValue(
      data.value
    );
  };

  public openScanner(): void {
    this.navCtrl.push(ScanPage, { fromAddressbook: true });
  }
}
