import { runGeoRules } from './GeoRules.js';
import { runChnRules } from './ChnRules.js';
import { runBrnRules } from './BrnRules.js';
import { runDatRules } from './DatRules.js';
import { runSupportRules } from './SupportRules.js';
import { runAggRules } from './AggRules.js';

export function runElementRules(element, context, prevElement, elemAxis, elemDir, config, log) {
  runGeoRules(element, context, prevElement, elemAxis, elemDir, config, log);
  runChnRules(element, context, prevElement, elemAxis, elemDir, config, log);
  runBrnRules(element, context, prevElement, elemAxis, elemDir, config, log);
  runDatRules(element, context, prevElement, elemAxis, elemDir, config, log);
}

export { runSupportRules, runAggRules };