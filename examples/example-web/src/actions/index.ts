import {defineAction, navActions} from '@launchtray/hatch-web';

const actions = {
  exampleAction: defineAction
    .type('exampleAction')
    .payload<{
      stringField: string,
      optionalStringField?: string,
    }>(),
  exampleAction2: defineAction
    .type('exampleAction2')
    .payload<{
      numberField: number,
    }>(),
  nav: navActions,
};

export default actions;
