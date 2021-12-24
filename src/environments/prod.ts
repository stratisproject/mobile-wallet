import { CurrencyProvider } from '../providers/currency/currency';
import { EnvironmentSchema } from './schema';

/**
 * Environment: prod
 */
const env: EnvironmentSchema = {
  name: 'production',
  enableAnimations: true,
  ratesAPI: new CurrencyProvider().getRatesApi(),
  activateScanner: true,
  defaultEndpoint: 'https://bws-test.stratis.top/bws/api'
};

export default env;
