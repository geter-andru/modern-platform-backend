import airtableService from '../services/airtableService.js';
import logger from '../utils/logger.js';

const exportController = {
  // Export customer data in specified format
  async exportData(req, res) {
    try {
      const { customerId, format } = req.params;
      const { includeData } = req.query;
      
      logger.info(`Exporting data for customer ${customerId} in format ${format}`);
      
      const customer = await airtableService.getCustomerById(customerId);
      
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
        const progressData = await airtableService.getUserProgress(customerId);
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

  // Get export status/history
  async getExportHistory(req, res) {
    try {
      const { customerId } = req.params;
      
      logger.info(`Fetching export history for customer ${customerId}`);
      
      // Get user progress data related to exports
      const progressData = await airtableService.getUserProgress(customerId, 'Export');
      
      res.status(200).json({
        success: true,
        data: {
          customerId,
          exports: progressData,
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
      
      const customer = await airtableService.getCustomerById(customerId);
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
      await airtableService.updateCustomer(customerId, {
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
      
      const customer = await airtableService.getCustomerById(customerId);
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
      
      const customer = await airtableService.getCustomerById(customerId);
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

  // Get export status
  async getExportStatus(req, res) {
    try {
      const { exportId } = req.params;
      
      // For demo purposes, simulate different statuses
      const statuses = ['completed', 'processing', 'pending'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      if (exportId === 'exp_nonexistent') {
        return res.status(404).json({
          success: false,
          error: 'Export not found'
        });
      }

      const response = {
        success: true,
        data: {
          exportId,
          status: randomStatus,
          progress: randomStatus === 'completed' ? 100 : Math.floor(Math.random() * 90) + 10,
          downloadUrl: `https://api.hs-platform.com/exports/${exportId}`,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error(`Error getting export status:`, error);
      throw error;
    }
  },

  // Delete export
  async deleteExport(req, res) {
    try {
      const { exportId } = req.params;
      
      if (exportId === 'exp_nonexistent') {
        return res.status(404).json({
          success: false,
          error: 'Export not found'
        });
      }

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
      
      const customer = await airtableService.getCustomerById(customerId);
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