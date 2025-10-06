/**
 * Supabase Data Service
 *
 * Handles all data operations for customer_assets and user_progress tables.
 * Replaces Airtable service with Supabase backend.
 */

import supabase from './supabaseService.js';
import logger from '../utils/logger.js';

class SupabaseDataService {
  /**
   * Get customer by ID
   * @param {string} customerId - Supabase user ID
   * @returns {Object|null} Customer data or null if not found
   */
  async getCustomerById(customerId) {
    try {
      const { data, error } = await supabase
        .from('customer_assets')
        .select('*')
        .eq('customer_id', customerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Not found
          logger.info(`Customer ${customerId} not found in database`);
          return null;
        }
        throw error;
      }

      // Transform Supabase data to match Airtable response format
      return {
        id: data.id,
        customerId: data.customer_id,
        customerName: data.customer_name,
        email: data.email,
        company: data.company,
        icpContent: data.icp_content,
        costCalculatorContent: data.cost_calculator_content,
        businessCaseContent: data.business_case_content,
        toolAccessStatus: data.tool_access_status,
        contentStatus: data.content_status,
        paymentStatus: data.payment_status,
        usageCount: data.usage_count,
        lastAccessed: data.last_accessed,
        createdAt: data.created_at,
      };
    } catch (error) {
      logger.error(`Error fetching customer ${customerId}:`, error);
      throw new Error('Failed to fetch customer data: ' + error.message);
    }
  }

  /**
   * Update customer data
   * @param {string} customerId - Supabase user ID
   * @param {Object} updateData - Fields to update (Airtable format with spaces)
   * @returns {Object} Updated record
   */
  async updateCustomer(customerId, updateData) {
    try {
      // First check if customer exists
      const existingCustomer = await this.getCustomerById(customerId);
      if (!existingCustomer) {
        throw new Error(`Customer ${customerId} not found`);
      }

      // Transform Airtable field names to Supabase column names
      const supabaseData = this._transformToSupabaseFields(updateData);

      // Always update the updated_at timestamp
      supabaseData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('customer_assets')
        .update(supabaseData)
        .eq('customer_id', customerId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.info(`Customer ${customerId} updated successfully`);
      return data;
    } catch (error) {
      logger.error(`Error updating customer ${customerId}:`, error);
      throw new Error('Failed to update customer: ' + error.message);
    }
  }

  /**
   * Get all customers
   * @param {number} limit - Maximum number of customers to return
   * @returns {Array} Array of customer objects
   */
  async getAllCustomers(limit = 100) {
    try {
      const { data, error } = await supabase
        .from('customer_assets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      // Transform to match Airtable response format
      return data.map(record => ({
        id: record.id,
        customerId: record.customer_id,
        customerName: record.customer_name,
        email: record.email,
        company: record.company,
        contentStatus: record.content_status,
        paymentStatus: record.payment_status,
        lastAccessed: record.last_accessed,
        createdAt: record.created_at,
      }));
    } catch (error) {
      logger.error('Error fetching all customers:', error);
      throw new Error('Failed to fetch customers: ' + error.message);
    }
  }

  /**
   * Create or update customer (upsert)
   * Used when customer signs up via Supabase Auth
   * @param {string} customerId - Supabase user ID
   * @param {Object} customerData - Customer information
   * @returns {Object} Created/updated customer record
   */
  async upsertCustomer(customerId, customerData) {
    try {
      const supabaseData = {
        customer_id: customerId,
        customer_name: customerData.customerName || customerData.name,
        email: customerData.email,
        company: customerData.company || null,
        tool_access_status: customerData.toolAccessStatus || 'active',
        content_status: customerData.contentStatus || 'pending',
        payment_status: customerData.paymentStatus || 'free',
        usage_count: customerData.usageCount || 0,
        last_accessed: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('customer_assets')
        .upsert(supabaseData, {
          onConflict: 'customer_id'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.info(`Customer ${customerId} upserted successfully`);
      return data;
    } catch (error) {
      logger.error(`Error upserting customer ${customerId}:`, error);
      throw new Error('Failed to upsert customer: ' + error.message);
    }
  }

  /**
   * Create user progress record
   * @param {string} customerId - Supabase user ID
   * @param {string} toolName - Name of the tool
   * @param {Object} progressData - Progress data object
   * @returns {Object} Created record
   */
  async createUserProgress(customerId, toolName, progressData) {
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .insert({
          customer_id: customerId,
          tool_name: toolName,
          progress_data: progressData,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.info(`User progress created for customer ${customerId}, tool ${toolName}`);
      return data;
    } catch (error) {
      logger.error(`Error creating user progress for ${customerId}:`, error);
      throw new Error('Failed to create user progress: ' + error.message);
    }
  }

  /**
   * Get user progress records
   * @param {string} customerId - Supabase user ID
   * @param {string|null} toolName - Optional tool name filter
   * @returns {Array} Array of progress records
   */
  async getUserProgress(customerId, toolName = null) {
    try {
      let query = supabase
        .from('user_progress')
        .select('*')
        .eq('customer_id', customerId)
        .order('updated_at', { ascending: false });

      if (toolName) {
        query = query.eq('tool_name', toolName);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Transform to match Airtable response format
      return data.map(record => ({
        id: record.id,
        customerId: record.customer_id,
        toolName: record.tool_name,
        progressData: record.progress_data,
        updatedAt: record.updated_at,
      }));
    } catch (error) {
      logger.error(`Error fetching user progress for ${customerId}:`, error);
      return [];
    }
  }

  /**
   * Update or create user progress (upsert)
   * @param {string} customerId - Supabase user ID
   * @param {string} toolName - Name of the tool
   * @param {Object} progressData - Progress data object
   * @returns {boolean} Success status
   */
  async updateUserProgress(customerId, toolName, progressData) {
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .upsert({
          customer_id: customerId,
          tool_name: toolName,
          progress_data: progressData,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'customer_id,tool_name'
        })
        .select();

      if (error) {
        throw error;
      }

      logger.info(`Updated user progress for customer ${customerId}, tool ${toolName}`);
      return true;
    } catch (error) {
      logger.error(`Error updating user progress for customer ${customerId}:`, error);
      throw new Error('Failed to update user progress: ' + error.message);
    }
  }

  /**
   * Create product details for a user
   * @param {string} userId - User ID (UUID from auth.users)
   * @param {Object} productData - Product information
   * @returns {Object} Created product details
   */
  async createProductDetails(userId, productData) {
    try {
      const { data, error } = await supabase
        .from('product_details')
        .insert({
          user_id: userId,
          product_name: productData.productName,
          product_description: productData.productDescription,
          distinguishing_feature: productData.distinguishingFeature,
          business_model: productData.businessModel,
          industry: productData.industry || null,
          target_market: productData.targetMarket || null,
          value_proposition: productData.valueProposition || null,
          is_primary: productData.isPrimary || true, // First product defaults to primary
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.info(`Product details created for user ${userId}`);
      return data;
    } catch (error) {
      logger.error(`Error creating product details for user ${userId}:`, error);
      throw new Error('Failed to create product details: ' + error.message);
    }
  }

  /**
   * Get product details by user ID
   * @param {string} userId - User ID (UUID from auth.users)
   * @returns {Array} Array of product details for the user
   */
  async getProductDetailsByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('product_details')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      logger.info(`Retrieved ${data?.length || 0} products for user ${userId}`);
      return data || [];
    } catch (error) {
      logger.error(`Error getting product details for user ${userId}:`, error);
      throw new Error('Failed to get product details: ' + error.message);
    }
  }

  /**
   * Get primary product for a user
   * @param {string} userId - User ID (UUID from auth.users)
   * @returns {Object|null} Primary product details or null
   */
  async getPrimaryProductDetails(userId) {
    try {
      const { data, error} = await supabase
        .from('product_details')
        .select('*')
        .eq('user_id', userId)
        .eq('is_primary', true)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        logger.info(`No primary product found for user ${userId}`);
        return null;
      }

      logger.info(`Retrieved primary product for user ${userId}`);
      return data;
    } catch (error) {
      logger.error(`Error getting primary product for user ${userId}:`, error);
      throw new Error('Failed to get primary product: ' + error.message);
    }
  }

  /**
   * Update or upsert product details (used when saving product form)
   * @param {string} userId - User ID (UUID from auth.users)
   * @param {Object} productData - Product information
   * @returns {Object} Created/updated product details
   */
  async upsertProductDetails(userId, productData) {
    try {
      // Check if user has existing products
      const existingProducts = await this.getProductDetailsByUserId(userId);
      const isPrimary = existingProducts.length === 0 ? true : (productData.isPrimary || false);

      const upsertData = {
        user_id: userId,
        product_name: productData.productName,
        product_description: productData.productDescription,
        distinguishing_feature: productData.distinguishingFeature,
        business_model: productData.businessModel,
        industry: productData.industry || null,
        target_market: productData.targetMarket || null,
        value_proposition: productData.valueProposition || null,
        is_primary: isPrimary,
        updated_at: new Date().toISOString(),
      };

      // If productId is provided, update specific product
      if (productData.id) {
        upsertData.id = productData.id;
      }

      const { data, error } = await supabase
        .from('product_details')
        .upsert(upsertData, {
          onConflict: productData.id ? 'id' : undefined
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.info(`Product details upserted for user ${userId}`);
      return data;
    } catch (error) {
      logger.error(`Error upserting product details for user ${userId}:`, error);
      throw new Error('Failed to upsert product details: ' + error.message);
    }
  }

  /**
   * Transform Airtable field names to Supabase column names
   * @private
   * @param {Object} airtableData - Data with Airtable field names (spaces)
   * @returns {Object} Data with Supabase column names (underscores)
   */
  _transformToSupabaseFields(airtableData) {
    const fieldMap = {
      'Customer ID': 'customer_id',
      'Customer Name': 'customer_name',
      'Email': 'email',
      'Company': 'company',
      'ICP Content': 'icp_content',
      'Cost Calculator Content': 'cost_calculator_content',
      'Business Case Content': 'business_case_content',
      'Tool Access Status': 'tool_access_status',
      'Content Status': 'content_status',
      'Payment Status': 'payment_status',
      'Usage Count': 'usage_count',
      'Last Accessed': 'last_accessed',
      'Created At': 'created_at',
      'Updated At': 'updated_at',
    };

    const supabaseData = {};

    for (const [airtableField, value] of Object.entries(airtableData)) {
      const supabaseField = fieldMap[airtableField];
      if (supabaseField) {
        supabaseData[supabaseField] = value;
      } else {
        // If no mapping found, convert to snake_case
        supabaseData[airtableField.toLowerCase().replace(/ /g, '_')] = value;
      }
    }

    return supabaseData;
  }
}

// Create singleton instance
const supabaseDataService = new SupabaseDataService();

export default supabaseDataService;
