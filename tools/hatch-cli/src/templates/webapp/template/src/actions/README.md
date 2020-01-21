# Actions

Actions are simply [Redux actions](https://redux.js.org/basics/actions). For the best developer experience, actions 
should be defined in a top-level `actions` object using the `defineAction` module in `hatch-web`. As an example:

```typescript
import {defineAction} from '@launchtray/hatch-web';

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
};

export default actions;
```
The syntax is admittedly a little weird (don't miss the trailing `()`), but ensures type safety.