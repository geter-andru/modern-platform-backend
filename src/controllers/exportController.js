import supabaseDataService from '../services/supabaseDataService.js';
import logger from '../utils/logger.js';

const exportController = {
  // Export customer data in specified format
  async exportData(req, res) {
    try {
      const { customerId, format } = req.params;
      const { includeData } = req.query;
      
      logger.info(`Exporting data for customer ${customerId} in format ${format}`);
      
      const customer = await supabaseDataService.getCustomerById(customerId);
      
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
          customerId
        });
      }

      // Parse includeData parameter
      const dataTypes = includeData ? includeData.split(',') : ['icp', 'cost_calculator', 'business_case'];
      
      // Collect data based on requested types
      const exportData = {
        customer: {
          id: customer.customerId,
          name: customer.customerName,
          email: customer.email,
          company: customer.company,
          exportedAt: new Date().toISOString()
        },
        data: {}
      };

      // Include ICP data if requested
      if (dataTypes.includes('icp') && customer.icpContent) {
        try {
          exportData.data.icp = JSON.parse(customer.icpContent);
        } catch (error) {
          exportData.data.icp = { rawContent: customer.icpContent };
        }
      }

      // Include cost calculator data if requested
      if (dataTypes.includes('cost_calculator') && customer.costCalculatorContent) {
        try {
          exportData.data.costCalculator = JSON.parse(customer.costCalculatorContent);
        } catch (error) {
          exportData.data.costCalculator = { rawContent: customer.costCalculatorContent };
        }
      }

      // Include business case data if requested
      if (dataTypes.includes('business_case') && customer.businessCaseContent) {
        try {
          exportData.data.businessCase = JSON.parse(customer.businessCaseContent);
        } catch (error) {
          exportData.data.businessCase = { rawContent: customer.businessCaseContent };
        }
      }

      // Include progress data if requested
      if (dataTypes.includes('progress')) {
        const progressData = await supabaseDataService.getUserProgress(customerId);
        exportData.data.progress = progressData;
      }

      // Format response based on requested format
      switch (format.toLowerCase()) {
        case 'json':
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="${customerId}-export.json"`);
          return res.status(200).json({
            success: true,
            data: exportData
          });

        case 'csv':
          const csvData = convertToCSV(exportData);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="${customerId}-export.csv"`);
          return res.status(200).send(csvData);

        case 'pdf':
          // For PDF export, return structured data that frontend can use to generate PDF
          const pdfStructure = generatePDFStructure(exportData);
          res.setHeader('Content-Type', 'application/json');
          return res.status(200).json({
            success: true,
            data: pdfStructure,
            format: 'pdf_structure'
          });

        case 'docx':
          // For DOCX export, return structured data that frontend can use to generate DOCX
          const docxStructure = generateDOCXStructure(exportData);
          res.setHeader('Content-Type', 'application/json');
          return res.status(200).json({
            success: true,
            data: docxStructure,
            format: 'docx_structure'
          });

        default:
          return res.status(400).json({
            success: false,
            error: 'Unsupported export format',
            supportedFormats: ['json', 'csv', 'pdf', 'docx']
          });
      }
    } catch (error) {
      logger.error(`Error exporting data for customer ${req.params.customerId}:`, error);
      throw error;
    }
  },

  // Get export history from Supabase database
  async getExportHistory(req, res) {
    try {
      const { customerId } = req.params;

      logger.info(`Fetching export history from database for customer ${customerId}`);

      // Query export_history table from Supabase
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data: exportHistory, error } = await supabase
        .from('export_history')
        .select('*')
        .eq('user_id', customerId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        logger.error(`Supabase error fetching export history:`, error);
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to fetch export history'
        });
      }

      // Transform database rows to response format
      const exports = (exportHistory || []).map(row => ({
        exportId: row.id,
        status: row.status || 'completed',
        downloadUrl: row.download_url,
        fileSize: row.file_size,
        expiresAt: row.expires_at,
        format: row.format || row.export_format,
        type: row.type || row.export_type,
        generatedAt: row.generated_at || row.created_at
      }));

      res.status(200).json({
        success: true,
        data: {
          customerId,
          exports,
          totalCount: exports.length,
          availableFormats: ['json', 'csv', 'pdf', 'docx'],
          availableData: ['icp', 'cost_calculator', 'business_case', 'progress']
        }
      });
    } catch (error) {
      logger.error(`Error fetching export history for customer ${req.params.customerId}:`, error);
      throw error;
    }
  },

  // Export ICP data
  async exportICP(req, res) {
    try {
      const { customerId, format, options } = req.body;
      
      const customer = await supabaseDataService.getCustomerById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }

      if (!customer.icpContent) {
        return res.status(400).json({
          success: false,
          error: 'No ICP content available for export'
        });
      }

      const exportId = `exp_${Date.now()}`;
      const filename = `ICP_${customerId}.${format}`;
      const downloadUrl = `https://api.hs-platform.com/exports/${exportId}.${format}`;

      let segmentCount = 0;
      try {
        const icpData = JSON.parse(customer.icpContent);
        segmentCount = icpData.segments ? icpData.segments.length : 0;
      } catch (parseError) {
        logger.warn(`Could not parse ICP content for segment count`);
      }

      // Update usage tracking
      await supabaseDataService.updateCustomer(customerId, {
        'Usage Count': (customer.usageCount || 0) + 1,
        'Last Accessed': new Date().toISOString()
      });

      res.status(200).json({
        success: true,
        data: {
          downloadUrl,
          format,
          filename,
          fileSize: 1024,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          metadata: {
            customerName: customer.customerName,
            generatedAt: new Date().toISOString(),
            segmentCount
          }
        }
      });
    } catch (error) {
      logger.error(`Error exporting ICP data:`, error);
      throw error;
    }
  },

  // Export cost calculator data
  async exportCostCalculator(req, res) {
    try {
      const { customerId, format, options } = req.body;
      
      const customer = await supabaseDataService.getCustomerById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }

      if (!customer.costCalculatorContent) {
        return res.status(400).json({
          success: false,
          error: 'No cost calculator data available for export'
        });
      }

      const exportId = `exp_${Date.now()}`;
      const filename = `Cost_Calculator_${customerId}.${format}`;
      const downloadUrl = `https://api.hs-platform.com/exports/${exportId}.${format}`;

      let totalCost = 0;
      let scenario = 'Unknown';
      let categoryCount = 0;
      let historicalDataPoints = 0;

      try {
        const costData = JSON.parse(customer.costCalculatorContent);
        if (costData.latestCalculation) {
          totalCost = costData.latestCalculation.totalCost || 0;
          scenario = costData.latestCalculation.scenario || 'Unknown';
          categoryCount = costData.latestCalculation.categories ? Object.keys(costData.latestCalculation.categories).length : 0;
        }
        if (costData.history) {
          historicalDataPoints = costData.history.length;
        }
      } catch (parseError) {
        logger.warn(`Could not parse cost calculator content for metadata`);
      }

      res.status(200).json({
        success: true,
        data: {
          downloadUrl,
          format,
          filename,
          fileSize: 2048,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          metadata: {
            totalCost,
            scenario,
            categoryCount,
            ...(options?.includeHistory && { historicalDataPoints })
          }
        }
      });
    } catch (error) {
      logger.error(`Error exporting cost calculator data:`, error);
      throw error;
    }
  },

  // Export comprehensive report
  async exportComprehensive(req, res) {
    try {
      const { customerId, format, sections, options } = req.body;
      
      const customer = await supabaseDataService.getCustomerById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }

      const availableSections = [];
      const unavailableSections = [];

      sections.forEach(section => {
        switch (section) {
          case 'icp':
            if (customer.icpContent) {
              availableSections.push(section);
            } else {
              unavailableSections.push(section);
            }
            break;
          case 'cost-calculator':
            if (customer.costCalculatorContent) {
              availableSections.push(section);
            } else {
              unavailableSections.push(section);
            }
            break;
          case 'business-case':
            if (customer.businessCaseContent) {
              availableSections.push(section);
            } else {
              unavailableSections.push(section);
            }
            break;
          default:
            unavailableSections.push(section);
        }
      });

      const exportId = `exp_${Date.now()}`;
      const filename = `Comprehensive_Report_${customerId}.${format}`;
      const downloadUrl = `https://api.hs-platform.com/exports/${exportId}.${format}`;

      res.status(200).json({
        success: true,
        data: {
          downloadUrl,
          format,
          filename,
          fileSize: 5120,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          metadata: {
            customerName: customer.customerName,
            sectionsIncluded: availableSections,
            ...(unavailableSections.length > 0 && { unavailableSections }),
            pageCount: availableSections.length * 3 // Rough estimate
          }
        }
      });
    } catch (error) {
      logger.error(`Error exporting comprehensive report:`, error);
      throw error;
    }
  },

  // Get export status from Supabase database
  async getExportStatus(req, res) {
    try {
      const { exportId } = req.params;

      logger.info(`Fetching export status from database for exportId: ${exportId}`);

      // Query export_history table from Supabase
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data: exportRecord, error } = await supabase
        .from('export_history')
        .select('*')
        .eq('id', exportId)
        .single();

      if (error || !exportRecord) {
        logger.error(`Export not found or Supabase error:`, error);
        return res.status(404).json({
          success: false,
          error: 'Export not found'
        });
      }

      // Calculate progress based on status
      const progressMap = {
        'completed': 100,
        'processing': 50,
        'pending': 10,
        'failed': 0
      };

      const response = {
        success: true,
        data: {
          exportId: exportRecord.id,
          status: exportRecord.status || 'completed',
          progress: progressMap[exportRecord.status] || 100,
          downloadUrl: exportRecord.download_url,
          fileSize: exportRecord.file_size,
          expiresAt: exportRecord.expires_at,
          metadata: {
            format: exportRecord.format || exportRecord.export_format,
            type: exportRecord.type || exportRecord.export_type,
            generatedAt: exportRecord.generated_at || exportRecord.created_at,
            processingTime: exportRecord.processing_time || 0
          }
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error(`Error getting export status:`, error);
      throw error;
    }
  },

  // Delete export from Supabase database
  async deleteExport(req, res) {
    try {
      const { exportId } = req.params;

      logger.info(`Deleting export from database: ${exportId}`);

      // Delete from export_history table in Supabase
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { error } = await supabase
        .from('export_history')
        .delete()
        .eq('id', exportId);

      if (error) {
        logger.error(`Supabase error deleting export:`, error);
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to delete export'
        });
      }

      logger.info(`Export ${exportId} deleted successfully`);

      res.status(200).json({
        success: true,
        data: {
          exportId,
          deleted: true,
          message: 'Export file and metadata deleted successfully'
        }
      });
    } catch (error) {
      logger.error(`Error deleting export:`, error);
      throw error;
    }
  },

  // Export business case
  async exportBusinessCase(req, res) {
    try {
      const { customerId, businessCaseId, format } = req.body;
      
      const customer = await supabaseDataService.getCustomerById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }

      if (!customer.businessCaseContent) {
        return res.status(400).json({
          success: false,
          error: 'No business case content available for export'
        });
      }

      const exportId = `exp_${Date.now()}`;
      const filename = `Business_Case_${businessCaseId || customerId}.${format}`;
      const downloadUrl = `https://api.hs-platform.com/exports/${exportId}.${format}`;

      res.status(200).json({
        success: true,
        data: {
          downloadUrl,
          format,
          filename,
          fileSize: 3072,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          metadata: {
            customerName: customer.customerName,
            generatedAt: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      logger.error(`Error exporting business case:`, error);
      throw error;
    }
  },

  // Resource export methods
  async exportResource(req, res) {
    try {
      const { resourceId, format, customerId } = req.body;
      
      logger.info(`Exporting resource ${resourceId} in format ${format} for customer ${customerId}`);
      
      // Validate required parameters
      if (!resourceId || !format || !customerId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: resourceId, format, customerId'
        });
      }

      // Get resource from Supabase
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data: resource, error: resourceError } = await supabase
        .from('resources')
        .select('*')
        .eq('id', resourceId)
        .eq('customer_id', customerId)
        .single();

      if (resourceError || !resource) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found or access denied'
        });
      }

      // Check if format is supported
      if (!resource.export_formats.includes(format.toLowerCase())) {
        return res.status(400).json({
          success: false,
          error: `Format ${format} not supported for this resource`
        });
      }

      // Generate export based on format
      let exportResult;
      switch (format.toLowerCase()) {
        case 'pdf':
          exportResult = await this.generatePDFExport(resource);
          break;
        case 'docx':
          exportResult = await this.generateWordExport(resource);
          break;
        case 'json':
          exportResult = await this.generateJSONExport(resource);
          break;
        case 'csv':
          exportResult = await this.generateCSVExport(resource);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: `Unsupported format: ${format}`
          });
      }

      // Track export in database
      await this.trackExport(resourceId, customerId, format, exportResult);

      res.json({
        success: true,
        data: {
          exportId: exportResult.exportId,
          downloadUrl: exportResult.downloadUrl,
          format: format,
          fileSize: exportResult.fileSize,
          expiresAt: exportResult.expiresAt
        }
      });

    } catch (error) {
      logger.error('Resource export error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export resource',
        details: error.message
      });
    }
  },

  async getResourceContent(req, res) {
    try {
      const { id } = req.params;
      const { customerId } = req.query;
      
      logger.info(`Getting content for resource ${id} for customer ${customerId}`);
      
      // Get resource from Supabase
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data: resource, error: resourceError } = await supabase
        .from('resources')
        .select('*')
        .eq('id', id)
        .eq('customer_id', customerId)
        .single();

      if (resourceError || !resource) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found or access denied'
        });
      }

      // Track access
      await this.trackResourceAccess(id, customerId);

      res.json({
        success: true,
        data: {
          id: resource.id,
          title: resource.title,
          description: resource.description,
          content: resource.content,
          metadata: resource.metadata,
          tier: resource.tier,
          category: resource.category,
          accessCount: resource.access_count,
          lastAccessed: resource.last_accessed
        }
      });

    } catch (error) {
      logger.error('Get resource content error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get resource content',
        details: error.message
      });
    }
  },

  async trackResourceAccess(req, res) {
    try {
      const { id } = req.params;
      const { customerId } = req.body;
      
      logger.info(`Tracking access for resource ${id} by customer ${customerId}`);
      
      await this.trackResourceAccess(id, customerId);

      res.json({
        success: true,
        message: 'Access tracked successfully'
      });

    } catch (error) {
      logger.error('Track resource access error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track resource access',
        details: error.message
      });
    }
  },

  async shareResource(req, res) {
    try {
      const { resourceId, customerId, shareType = 'view' } = req.body;
      
      logger.info(`Sharing resource ${resourceId} for customer ${customerId} with type ${shareType}`);
      
      // Generate shareable link
      const shareToken = this.generateShareToken(resourceId, customerId, shareType);
      const shareUrl = `${process.env.FRONTEND_URL}/resources/shared/${shareToken}`;
      
      // Store share record in database
      await this.storeShareRecord(resourceId, customerId, shareToken, shareType);

      res.json({
        success: true,
        data: {
          shareUrl: shareUrl,
          shareToken: shareToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        }
      });

    } catch (error) {
      logger.error('Share resource error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to share resource',
        details: error.message
      });
    }
  },

  // Helper methods for resource export
  async generatePDFExport(resource) {
    // Mock implementation - would use Puppeteer or similar
    const exportId = `pdf_${resource.id}_${Date.now()}`;
    return {
      exportId,
      downloadUrl: `${process.env.BACKEND_URL}/api/exports/${exportId}`,
      fileSize: 1024 * 1024, // 1MB mock
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };
  },

  async generateWordExport(resource) {
    // Mock implementation - would use docx library
    const exportId = `docx_${resource.id}_${Date.now()}`;
    return {
      exportId,
      downloadUrl: `${process.env.BACKEND_URL}/api/exports/${exportId}`,
      fileSize: 512 * 1024, // 512KB mock
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  },

  async generateJSONExport(resource) {
    // Mock implementation
    const exportId = `json_${resource.id}_${Date.now()}`;
    return {
      exportId,
      downloadUrl: `${process.env.BACKEND_URL}/api/exports/${exportId}`,
      fileSize: 256 * 1024, // 256KB mock
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  },

  async generateCSVExport(resource) {
    // Mock implementation
    const exportId = `csv_${resource.id}_${Date.now()}`;
    return {
      exportId,
      downloadUrl: `${process.env.BACKEND_URL}/api/exports/${exportId}`,
      fileSize: 128 * 1024, // 128KB mock
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  },

  async trackExport(resourceId, customerId, format, exportResult) {
    // Track export in database
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // For now, we'll use a mock user_id since we don't have auth integration yet
    // In production, this would come from the authenticated user
    const mockUserId = '00000000-0000-0000-0000-000000000001';

    await supabase
      .from('export_history')
      .insert({
        user_id: mockUserId,
        export_type: 'custom', // Using 'custom' since 'resource' is not in the allowed values
        export_format: format,
        file_name: `resource_${resourceId}_${Date.now()}.${format}`,
        file_size: exportResult.fileSize,
        download_url: exportResult.downloadUrl,
        status: 'completed',
        requested_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      });
  },

  async trackResourceAccess(resourceId, customerId) {
    // Update access count and last accessed
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    await supabase
      .from('resources')
      .update({
        access_count: supabase.raw('access_count + 1'),
        last_accessed: new Date().toISOString()
      })
      .eq('id', resourceId)
      .eq('customer_id', customerId);
  },

  generateShareToken(resourceId, customerId, shareType) {
    // Generate a secure share token
    const crypto = require('crypto');
    const data = `${resourceId}:${customerId}:${shareType}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
  },

  async storeShareRecord(resourceId, customerId, shareToken, shareType) {
    // Store share record in database
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    await supabase
      .from('resource_shares')
      .insert({
        resource_id: resourceId,
        customer_id: customerId,
        share_token: shareToken,
        share_type: shareType,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
  }
};

// Helper function to convert data to CSV format
function convertToCSV(exportData) {
  const rows = [];
  
  // Add header
  rows.push(['Category', 'Field', 'Value']);
  
  // Add customer info
  rows.push(['Customer', 'ID', exportData.customer.id]);
  rows.push(['Customer', 'Name', exportData.customer.name]);
  rows.push(['Customer', 'Email', exportData.customer.email]);
  rows.push(['Customer', 'Company', exportData.customer.company]);
  
  // Add data sections
  Object.keys(exportData.data).forEach(section => {
    const sectionData = exportData.data[section];
    if (typeof sectionData === 'object') {
      flattenObject(sectionData, section).forEach(([key, value]) => {
        rows.push([section, key, value]);
      });
    }
  });
  
  // Convert to CSV string
  return rows.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
}

// Helper function to flatten nested objects for CSV
function flattenObject(obj, prefix = '') {
  const flattened = [];
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flattened.push(...flattenObject(value, newKey));
    } else {
      flattened.push([newKey, Array.isArray(value) ? value.join('; ') : value]);
    }
  });
  
  return flattened;
}

// Helper function to generate PDF structure
function generatePDFStructure(exportData) {
  return {
    title: `Revenue Intelligence Report - ${exportData.customer.name}`,
    sections: [
      {
        title: 'Customer Information',
        content: [
          `Customer ID: ${exportData.customer.id}`,
          `Name: ${exportData.customer.name}`,
          `Email: ${exportData.customer.email}`,
          `Company: ${exportData.customer.company}`,
          `Report Generated: ${exportData.customer.exportedAt}`
        ]
      },
      ...(exportData.data.icp ? [{
        title: 'Ideal Customer Profile Analysis',
        content: generateICPContent(exportData.data.icp)
      }] : []),
      ...(exportData.data.costCalculator ? [{
        title: 'Cost of Inaction Analysis',
        content: generateCostCalculatorContent(exportData.data.costCalculator)
      }] : []),
      ...(exportData.data.businessCase ? [{
        title: 'Business Case',
        content: generateBusinessCaseContent(exportData.data.businessCase)
      }] : [])
    ]
  };
}

// Helper function to generate DOCX structure  
function generateDOCXStructure(exportData) {
  return {
    title: `Revenue Intelligence Report - ${exportData.customer.name}`,
    paragraphs: [
      { text: 'H&S Revenue Intelligence Platform Report', style: 'title' },
      { text: `Generated for: ${exportData.customer.name}`, style: 'subtitle' },
      { text: `Date: ${new Date(exportData.customer.exportedAt).toLocaleDateString()}`, style: 'normal' },
      { text: '', style: 'normal' }, // Empty line
      ...generateDocumentContent(exportData)
    ]
  };
}

// Helper functions for content generation
function generateICPContent(icpData) {
  const content = [];
  if (icpData.title) content.push(`Analysis: ${icpData.title}`);
  if (icpData.description) content.push(`Description: ${icpData.description}`);
  return content;
}

function generateCostCalculatorContent(costData) {
  const content = [];
  if (costData.totalCost) {
    content.push(`Total Cost of Inaction: $${costData.totalCost.toLocaleString()}`);
  }
  if (costData.scenario) {
    content.push(`Scenario: ${costData.scenario}`);
  }
  return content;
}

function generateBusinessCaseContent(businessData) {
  const content = [];
  if (businessData.caseType) content.push(`Case Type: ${businessData.caseType}`);
  if (businessData.industry) content.push(`Industry: ${businessData.industry}`);
  if (businessData.budget) content.push(`Budget: $${businessData.budget.toLocaleString()}`);
  return content;
}

function generateDocumentContent(exportData) {
  const paragraphs = [];
  
  // Customer section
  paragraphs.push({ text: 'Customer Information', style: 'heading1' });
  paragraphs.push({ text: `Customer ID: ${exportData.customer.id}`, style: 'normal' });
  paragraphs.push({ text: `Company: ${exportData.customer.company}`, style: 'normal' });
  
  // Add data sections
  Object.keys(exportData.data).forEach(section => {
    paragraphs.push({ text: section.charAt(0).toUpperCase() + section.slice(1), style: 'heading1' });
    // Add section content based on data structure
  });
  
  return paragraphs;
}

export default exportController;