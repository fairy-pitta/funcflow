/**
 * Complex test fixture with cycles and nested calls
 */

function a() {
  b();
  c();
}

function b() {
  c();
  a(); // Circular call
}

function c() {
  d();
}

function d() {
  // Terminal function
}

// Arrow functions
const arrowFunc = () => {
  a();
};

// Method in object
const obj = {
  method() {
    b();
  },
};

// Nested calls
function nested() {
  return helper1(helper2(helper3()));
}

function helper1(x: unknown) {
  return x;
}

function helper2(x: unknown) {
  return x;
}

function helper3() {
  return 42;
}

export { a, b, c, d, arrowFunc, obj, nested, helper1, helper2, helper3 };
