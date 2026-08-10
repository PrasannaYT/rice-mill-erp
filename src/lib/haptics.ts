export const hapticSuccess = () => { if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) { window.navigator.vibrate([15, 50, 15]); } };
export const hapticError = () => { if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) { window.navigator.vibrate([50, 100, 50, 100, 50]); } };
export const hapticLight = () => { if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) { window.navigator.vibrate(10); } };
