import test from 'node:test'
import assert from 'node:assert/strict'
import { clampPose, safeProfile, safeRoom } from './worker.mjs'

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
    color: '#d97d4f',
    accessory: 'sombrero',
  }), {
    name: 'Chicherito del Nor',
    color: '#d97d4f',
    accessory: 'sombrero',
  })
  assert.deepEqual(safeProfile({
    name: '',
    color: 'url(javascript:alert(1))',
    accessory: 'unknown',
  }), {
    name: 'Chicherito',
    color: '#d97d4f',
    accessory: 'pañuelo',
  })
})

test('remote poses are finite and bounded to the game arena', () => {
  assert.deepEqual(clampPose({ x: 80, y: 3, z: -80, vx: 40, vz: -40, jump: true }), {
    x: 49, y: 3, z: -49, vx: 20, vz: -20, jump: true,
  })
  assert.deepEqual(clampPose({ x: 'NaN', y: Infinity, z: null, vx: 'bad', vz: 2, jump: 'true' }), {
    x: -17, y: 0, z: 0, vx: 0, vz: 2, jump: false,
  })
})
