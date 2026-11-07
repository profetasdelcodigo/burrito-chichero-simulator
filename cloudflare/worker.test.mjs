import test from 'node:test'
import assert from 'node:assert/strict'
import { clampInput, safeProfile, safeRoom } from './worker.mjs'

test('room codes are normalized and restricted to 4-8 alphanumeric characters', () => {
  assert.equal(safeRoom('piura1'), 'PIURA1')
  assert.equal(safeRoom('AB12'), 'AB12')
  assert.equal(safeRoom('abc'), '')
  assert.equal(safeRoom('ROOM-01'), '')
  assert.equal(safeRoom('TOO-LONG-ROOM'), '')
})

test('profiles are bounded to the public allowlists', () => {
  assert.deepEqual(safeProfile({
    name: '  Chicherito del Norte, muy largo  ',
    color: '#e86b5a',
    accessory: 'sombrero',
  }), {
    name: 'Chicherito del Nor',
    color: '#e86b5a',
    accessory: 'sombrero',
  })
  assert.deepEqual(safeProfile({
    name: '',
    color: 'url(javascript:alert(1))',
    accessory: 'unknown',
  }), {
    name: 'Chicherito',
    color: '#e86b5a',
    accessory: 'pañuelo',
  })
})

test('movement input is finite, normalized and bounded', () => {
  assert.deepEqual(clampInput({ x: 5, z: -2, jump: true }), { x: 1, z: -1, jump: true })
  assert.deepEqual(clampInput({ x: 'NaN', z: Infinity, jump: 'true' }), { x: 0, z: 0, jump: false })
})
