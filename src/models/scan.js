'use strict';

const db = require('../config/database');

class Scan {
    constructor({ scanId, photoUrl, scanResult, scanDate }) {
        this.scanId = scanId;
        this.photoUrl = photoUrl;
        this.scanResult = scanResult;
        this.scanDate = scanDate;
    }

    // Static methods for database operations
    static async add(scan) {
        try {
            const query = `
                INSERT INTO scans (scan_id, photo_url, scan_result, scan_date)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;
            const values = [scan.scanId, scan.photoUrl, scan.scanResult, scan.scanDate];
            const result = await db.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error adding scan to database:', error);
            throw error;
        }
    }

    static async findByScanId(scanId) {
        try {
            const query = 'SELECT * FROM scans WHERE scan_id = $1';
            const result = await db.query(query, [scanId]);

            if (result.rows.length === 0) {
                return null;
            }

            const scan = result.rows[0];
            return new Scan({
                scanId: scan.scan_id,
                photoUrl: scan.photo_url,
                scanResult: scan.scan_result,
                scanDate: scan.scan_date
            });
        } catch (error) {
            console.error('Error finding scan by ID:', error);
            throw error;
        }
    }

    static async getAll() {
        try {
            const query = 'SELECT * FROM scans ORDER BY scan_date DESC';
            const result = await db.query(query);

            return result.rows.map(scan => new Scan({
                scanId: scan.scan_id,
                photoUrl: scan.photo_url,
                scanResult: scan.scan_result,
                scanDate: scan.scan_date
            }));
        } catch (error) {
            console.error('Error getting all scans:', error);
            throw error;
        }
    }

    static async updateScanResult(scanId, scanResult) {
        try {
            const query = `
                UPDATE scans
                SET scan_result = $1
                WHERE scan_id = $2
                RETURNING *
            `;
            const result = await db.query(query, [scanResult, scanId]);

            if (result.rows.length === 0) {
                return null;
            }

            const scan = result.rows[0];
            return new Scan({
                scanId: scan.scan_id,
                photoUrl: scan.photo_url,
                scanResult: scan.scan_result,
                scanDate: scan.scan_date
            });
        } catch (error) {
            console.error('Error updating scan result:', error);
            throw error;
        }
    }
}

module.exports = Scan;
