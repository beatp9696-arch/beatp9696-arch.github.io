import {mountMoney} from '../features/money/workspace.js';
export {CATS,localDate} from '../features/money/model.js';

export default {
  id: 'money',
  name: 'Money',
  icon: '💰',
  mount: mountMoney,
};
