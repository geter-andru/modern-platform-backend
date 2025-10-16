import Airtable from 'airtable';
import config from '../config/index.js';
import logger from '../utils/logger.js';

class AirtableService {
  constructor() {
    this.base = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 3;
    
    this.init();
  }

  async init() {
    try {
      // Configure Airtable
      Airtable.configure({
        apiKey: config.airtable.apiKey,
      });

      this.base = Airtable.base(config.airtable.baseId);
      
      // Test connection
      await this.testConnection();
      this.isConnected = true;
      
      logger.info('Airtable service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Airtable service:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      // Test connection by fetching one record
      const records = await this.base(config.airtable.tables.customerAssets)
        .select({
          maxRecords: 1,
          view: 'Grid view'
        })
        .firstPage();
      
      logger.info('Airtable connection test successful');
      return true;
    } catch (error) {
      logger.error('Airtable connection test failed:', error);
      throw new Error('Failed to connect to Airtable: ' + error.message);
    }
  }

  async getCustomerById(customerId) {
    try {
      const records = await this.base(config.airtable.tables.customerAssets)
        .select({
          filterByFormula: `{Customer ID} = '${customerId}'`,
          maxRecords: 1
        })
        .firstPage();

      if (records.length === 0) {
        return null;
      }

      const record = records[0];
      return {
        id: record.id,
        customerId: record.get('Customer ID'),
        customerName: record.get('Customer Name'),
        email: record.get('Email'),
        company: record.get('Company'),
        icpContent: record.get('ICP Content'),
        costCalculatorContent: record.get('Cost Calculator Content'),
        businessCaseContent: record.get('Business Case Content'),
        toolAccessStatus: record.get('Tool Access Status'),
        contentStatus: record.get('Content Status'),
        paymentStatus: record.get('Payment Status'),
        usageCount: record.get('Usage Count'),
        lastAccessed: record.get('Last Accessed'),
        createdAt: record.get('Created At'),
      };
    } catch (error) {
      logger.error(`Error fetching customer ${customerId}:`, error);
      throw new Error('Failed to fetch customer data: ' + error.message);
    }
  }

  async updateCustomer(customerId, updateData) {
    try {
      // First find the record
      const records = await this.base(config.airtable.tables.customerAssets)
        .select({
          filterByFormula: `{Customer ID} = '${customerId}'`,
          maxRecords: 1
        })
        .firstPage();

      if (records.length === 0) {
        throw new Error(`Customer ${customerId} not found`);
      }

      const record = records[0];
      
      // Update the record
      const updatedRecord = await this.base(config.airtable.tables.customerAssets)
        .update([
          {
            id: record.id,
            fields: updateData
          }
        ]);

      logger.info(`Customer ${customerId} updated successfully`);
      return updatedRecord[0];
    } catch (error) {
      logger.error(`Error updating customer ${customerId}:`, error);
      throw new Error('Failed to update customer: ' + error.message);
    }
  }

  async createUserProgress(customerId, toolName, progressData) {
    try {
      const record = await this.base(config.airtable.tables.userProgress)
        .create([
          {
            fields: {
              'Customer ID': customerId,
              'Tool Name': toolName,
              'Progress Data': JSON.stringify(progressData),
              'Updated At': new Date().toISOString(),
            }
          }
        ]);

      logger.info(`User progress created for customer ${customerId}, tool ${toolName}`);
      return record[0];
    } catch (error) {
      logger.error(`Error creating user progress for ${customerId}:`, error);
      throw new Error('Failed to create user progress: ' + error.message);
    }
  }

  async getUserProgress(customerId, toolName = null) {
    try {
      let filterFormula = `{Customer ID} = '${customerId}'`;
      if (toolName) {
        filterFormula += ` AND {Tool Name} = '${toolName}'`;
      }

      const records = await this.base(config.airtable.tables.userProgress)
        .select({
          filterByFormula: filterFormula,
          sort: [{ field: 'Updated At', direction: 'desc' }]
        })
        .firstPage();

      return records.map(record => ({
        id: record.id,
        customerId: record.get('Customer ID'),
        toolName: record.get('Tool Name'),
        progressData: JSON.parse(record.get('Progress Data') || '{}'),
        updatedAt: record.get('Updated At'),
      }));
    } catch (error) {
      logger.error(`Error fetching user progress for ${customerId}:`, error);
      throw new Error('Failed to fetch user progress: ' + error.message);
    }
  }

  async getAllCustomers(limit = 100) {
    try {
      const records = await this.base(config.airtable.tables.customerAssets)
        .select({
          maxRecords: limit,
          sort: [{ field: 'Created At', direction: 'desc' }]
        })
        .firstPage();

      return records.map(record => ({
        id: record.id,
        customerId: record.get('Customer ID'),
        customerName: record.get('Customer Name'),
        email: record.get('Email'),
        company: record.get('Company'),
        contentStatus: record.get('Content Status'),
        paymentStatus: record.get('Payment Status'),
        lastAccessed: record.get('Last Accessed'),
        createdAt: record.get('Created At'),
      }));
    } catch (error) {
      logger.error('Error fetching all customers:', error);
      throw new Error('Failed to fetch customers: ' + error.message);
    }
  }

  async getUserProgress(customerId, toolName = null) {
    try {
      let filter = `{Customer ID} = '${customerId}'`;
      if (toolName) {
        filter = `AND({Customer ID} = '${customerId}', {Tool Name} = '${toolName}')`;
      }

      const records = await this.base(config.airtable.tables.userProgress)
        .select({
          filterByFormula: filter,
          sort: [{ field: 'Updated At', direction: 'desc' }]
        })
        .firstPage();

      return records.map(record => ({
        id: record.id,
        customerId: record.get('Customer ID'),
        toolName: record.get('Tool Name'),
        progressData: record.get('Progress Data'),
        updatedAt: record.get('Updated At')
      }));
    } catch (error) {
      logger.error(`Error getting user progress for customer ${customerId}:`, error);
      return [];
    }
  }

  async updateUserProgress(customerId, toolName, progressData) {
    try {
      // Check if record exists
      const existingRecords = await this.base(config.airtable.tables.userProgress)
        .select({
          filterByFormula: `AND({Customer ID} = '${customerId}', {Tool Name} = '${toolName}')`,
          maxRecords: 1
        })
        .firstPage();

      const data = {
        'Customer ID': customerId,
        'Tool Name': toolName,
        'Progress Data': JSON.stringify(progressData),
        'Updated At': new Date().toISOString()
      };

      if (existingRecords.length > 0) {
        // Update existing record
        await this.base(config.airtable.tables.userProgress).update(existingRecords[0].id, data);
        logger.info(`Updated user progress for customer ${customerId}, tool ${toolName}`);
      } else {
        // Create new record
        await this.base(config.airtable.tables.userProgress).create(data);
        logger.info(`Created user progress for customer ${customerId}, tool ${toolName}`);
      }

      return true;
    } catch (error) {
      logger.error(`Error updating user progress for customer ${customerId}:`, error);
      throw new Error('Failed to update user progress: ' + error.message);
    }
  }
}

// Create singleton instance
const airtableService = new AirtableService();

export default airtableService;