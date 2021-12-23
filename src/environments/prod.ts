import { CurrencyProvider } from '../providers/currency/currency';
import { EnvironmentSchema } from './schema';
import { enableProdMode } from '@angular/core';

/**
 * Environment: prod
 */
const env: EnvironmentSchema = {
  name: 'production',
  enableAnimations: true,
  ratesAPI: new CurrencyProvider().getRatesApi(),
  activateScanner: true,
  defaultEndpoint: 'https://bws.stratisplatform.com/bws/api'
};

enableProdMode();

export default env;
