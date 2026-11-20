// Числа формулы на экране «Как считается совпадение». Источник истины: backend/app/config.py
// (W_SEMANTIC, W_COVERAGE, BOOST_CITY_MATCH, BOOST_INDUSTRY_MATCH, BOOST_AVAILABILITY["busy"]).
// Меняешь веса там: меняй и здесь.
export const WEIGHT_SEMANTIC = 60
export const WEIGHT_COVERAGE = 40
export const BOOST_CITY = 1.3
export const BOOST_INDUSTRY = 1.2
export const BOOST_AVAILABILITY_BUSY = 0.7
