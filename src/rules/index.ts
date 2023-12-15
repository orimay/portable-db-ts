import { dbRuleEmpty } from './empty';
import { dbRuleEq } from './eq';
import { dbRuleEveryEq } from './every-eq';
import { dbRuleEveryPrefix } from './every-prefix';
import { dbRuleExcluded } from './excluded';
import { dbRuleGt } from './gt';
import { dbRuleGte } from './gte';
import { dbRuleIncluded } from './included';
import { dbRuleLt } from './lt';
import { dbRuleLte } from './lte';
import { dbRulePrefix } from './prefix';

export const rules = [
  dbRulePrefix,
  dbRuleEq,
  dbRuleEmpty,
  dbRuleEveryEq,
  dbRuleEveryPrefix,
  dbRuleGt,
  dbRuleGte,
  dbRuleLte,
  dbRuleLt,
  dbRuleIncluded,
  dbRuleExcluded,
];
