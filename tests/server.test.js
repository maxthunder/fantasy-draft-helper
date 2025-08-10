const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');

// Mock fs module
jest.mock('fs');

describe('Fantasy Draft Helper Server', () => {
  let app;
  let server;

  beforeEach(() => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    
    // Clear require cache
    jest.resetModules();
    
    // Set up default mock data
    const mockPlayers = [
      {
        id: 'qb1',
        name: 'Test QB',
        position: 'QB',
        team: 'TST',
        stats2024: { fantasyPoints: 300 },
        projectedStats2025: { projectedPoints: 320 }
      }
    ];
    
    const mockScoring = {
      passing: { yards: 0.04, touchdowns: 4, interceptions: -2 },
      rushing: { yards: 0.1, touchdowns: 6 },
      receiving: { receptions: 0.5, yards: 0.1, touchdowns: 6 }
    };
    
    // Mock file system
    fs.readFileSync.mockImplementation((filePath) => {
      if (filePath.includes('players.json')) {
        return JSON.stringify(mockPlayers);
      }
      if (filePath.includes('scoring.json')) {
        return JSON.stringify(mockScoring);
      }
      if (filePath.includes('.html') || filePath.includes('.js') || filePath.includes('.css')) {
        return '<html>test</html>';
      }
      throw new Error('File not found');
    });
    
    fs.writeFileSync.mockImplementation(() => {});
    fs.existsSync.mockReturnValue(true);
    
    // Import server after mocks are set up
    const serverModule = require('../server.js');
    app = serverModule.app;
  });

  afterEach(() => {
    if (server) {
      server.close();
    }
  });

  describe('GET /api/players', () => {
    test('returns players data', async () => {
      const response = await request(app)
        .get('/api/players')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body[0]).toHaveProperty('id', 'qb1');
      expect(response.body[0]).toHaveProperty('name', 'Test QB');
    });
  });

  describe('GET /api/scoring', () => {
    test('returns scoring settings', async () => {
      const response = await request(app)
        .get('/api/scoring')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('passing');
      expect(response.body).toHaveProperty('rushing');
      expect(response.body).toHaveProperty('receiving');
      expect(response.body.passing.yards).toBe(0.04);
    });
  });

  describe('POST /api/players/update', () => {
    test('updates player drafted status', async () => {
      const updateData = {
        playerId: 'qb1',
        field: 'isDrafted',
        value: true
      };

      const response = await request(app)
        .post('/api/players/update')
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    test('updates player team status', async () => {
      const updateData = {
        playerId: 'qb1',
        field: 'isMyTeam',
        value: true
      };

      const response = await request(app)
        .post('/api/players/update')
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    test('returns 404 for non-existent player', async () => {
      const updateData = {
        playerId: 'invalid',
        field: 'isDrafted',
        value: true
      };

      const response = await request(app)
        .post('/api/players/update')
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Player not found');
    });
  });

  describe('POST /api/scoring/update', () => {
    test('updates scoring settings', async () => {
      const newScoring = {
        passing: { yards: 0.05, touchdowns: 6, interceptions: -2 },
        rushing: { yards: 0.1, touchdowns: 6 },
        receiving: { receptions: 1, yards: 0.1, touchdowns: 6 }
      };

      const response = await request(app)
        .post('/api/scoring/update')
        .send(newScoring)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('Static file serving', () => {
    test('serves index.html at root', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('test');
    });

    test('serves scoring.html', async () => {
      const response = await request(app)
        .get('/scoring.html')
        .expect(200);

      expect(response.text).toContain('test');
    });
  });
});