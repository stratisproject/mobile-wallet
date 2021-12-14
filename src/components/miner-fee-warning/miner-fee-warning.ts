import { Component } from '@angular/core';
import { AppProvider } from '../../providers/app/app';
import { ExternalLinkProvider } from '../../providers/external-link/external-link';
import { ActionSheetParent } from '../action-sheet/action-sheet-parent';

@Component({
  selector: 'miner-fee-warning',
  templateUrl: 'miner-fee-warning.html'
})
export class MinerFeeWarningComponent extends ActionSheetParent {
  public appName: string;

  constructor(
    private appProvider: AppProvider,
    private externalLinkProvider: ExternalLinkProvider
  ) {
    super();
    this.appName = this.appProvider.info.nameCase;
  }

  public confirm(): void {
    this.dismiss();
  }

  public openExternalLink(): void {
    const url =
      'https://stratisplatform.com/';
    this.externalLinkProvider.open(url);
  }
}
