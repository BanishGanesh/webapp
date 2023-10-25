const request= require('supertest');
const app = require('./server');
const chai=require('chai');
const expect = chai.expect
var mocha = require('mocha')
// var describe = mocha.describe
//var it = mocha.it;


var assert = require('assert');
describe('Array', function () {
  describe('#indexOf()', function () {
    it('should return -1 when the value is not present', function () {
      assert.equal([1, 2, 3].indexOf(4), -1);
    });
  });
});

describe('Health Test', function() {
  describe('Successes', function() {
      it('health', function(done) {
          request(app).get('/healthz').send({
}).end(function(err, res) {
              expect(res.statusCode).to.be.equal(200);
              done();
              console.log(res.statusCode);
          })
      })
  })
})