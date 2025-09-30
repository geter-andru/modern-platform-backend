import airtableService from '../services/airtableService.js';
import logger from '../utils/logger.js';

const businessCaseController = {
  // Generate business case
  async generateBusinessCase(req, res) {
    try {
      const {
        customerId,
        caseType,
        industry,
        companySize,
        budget,
        timeline,
        objectives,
        successMetrics
      } = req.body;

      logger.info(`Generating ${caseType} business case for customer ${customerId}`);

      // Get existing customer data for context
      const customer = await airtableService.getCustomerById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
          customerId
        });
      }

      // Business case templates based on type
      const businessCaseTemplates = {
        pilot: {
          duration: '3-6 months',
          investmentRange: '$25,000-$75,000',
          sections: [
            'Executive Summary',
            'Problem Statement', 
            'Proposed Solution',
            'Success Metrics',
            'Investment & ROI',
            'Next Steps'
          ],
          keyPoints: [
            'Low-risk evaluation period',
            'Measurable success criteria',
            'Clear path to full implementation'
          ]
        },
        full_implementation: {
          duration: '6-18 months',
          investmentRange: '$100,000-$500,000',
          sections: [
            'Strategic Alignment',
            'Current State Analysis',
            'Solution Architecture',
            'Financial Projections',
            'Risk Assessment',
            'Implementation Timeline'
          ],
          keyPoints: [
            'Comprehensive transformation',
            'Long-term value creation',
            'Competitive advantage'
          ]
        }
      };

      const template = businessCaseTemplates[caseType];

      // ROI calculation framework
      const roiCalculation = {
        formula: '(Benefits - Costs) / Costs * 100',
        components: [
          'Direct cost savings',
          'Revenue increases', 
          'Productivity gains',
          'Risk mitigation value'
        ],
        paybackPeriod: {
          formula: 'Initial Investment / Annual Benefits',
          benchmark: 'Target: 12-18 months'
        }
      };

      // Success metrics framework
      const metricsFramework = {
        financial: [
          'Cost reduction %',
          'Revenue increase %', 
          'ROI %',
          'Payback period'
        ],
        operational: [
          'Process efficiency gains',
          'Error reduction %',
          'Time savings',
          'User adoption rate'
        ],
        strategic: [
          'Market share growth',
          'Competitive advantage',
          'Innovation capacity',
          'Scalability improvement'
        ]
      };

      // Generate business case structure
      const businessCase = {
        customerId,
        caseType,
        industry,
        companySize,
        budget,
        timeline,
        template,
        executiveSummary: {
          challenge: `${customer.customerName} seeks to optimize revenue intelligence processes for ${industry} market`,
          solution: `Implement H&S Revenue Intelligence Platform for ${caseType === 'pilot' ? 'pilot evaluation' : 'full transformation'}`,
          investment: `$${budget.toLocaleString()} over ${timeline} months`,
          expectedROI: calculateExpectedROI(budget, caseType),
          keyBenefits: objectives
        },
        financialProjections: {
          investment: budget,
          timeline: timeline,
          roiFramework: roiCalculation,
          projectedBenefits: calculateProjectedBenefits(budget, caseType, industry),
          paybackPeriod: calculatePaybackPeriod(budget, caseType)
        },
        implementationPlan: {
          phases: generateImplementationPhases(caseType, timeline),
          milestones: generateMilestones(caseType, timeline),
          riskMitigation: generateRiskMitigation(caseType, companySize)
        },
        successMetrics: {
          framework: metricsFramework,
          customMetrics: successMetrics,
          measurementPlan: generateMeasurementPlan(caseType, timeline)
        },
        nextSteps: generateNextSteps(caseType),
        generatedAt: new Date().toISOString()
      };

      // Save business case to customer record
      await airtableService.updateCustomer(customerId, {
        'Business Case Content': JSON.stringify(businessCase),
        'Content Status': 'Ready',
        'Last Accessed': new Date().toISOString()
      });

      // Create user progress record
      await airtableService.createUserProgress(customerId, 'Business Case Builder', {
        caseType,
        industry,
        companySize,
        budget,
        timeline,
        completedAt: new Date().toISOString()
      });

      logger.info(`Business case generated for customer ${customerId}, type: ${caseType}, budget: $${budget}`);

      res.status(200).json({
        success: true,
        data: businessCase
      });
    } catch (error) {
      logger.error('Error generating business case:', error);
      throw error;
    }
  },

  // Get saved business case
  async getBusinessCase(req, res) {
    try {
      const { customerId } = req.params;
      
      logger.info(`Fetching business case for customer ${customerId}`);
      
      const customer = await airtableService.getCustomerById(customerId);
      
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
          customerId
        });
      }

      let businessCaseData = null;
      if (customer.businessCaseContent) {
        try {
          businessCaseData = JSON.parse(customer.businessCaseContent);
        } catch (parseError) {
          logger.warn(`Failed to parse business case content for customer ${customerId}:`, parseError);
          businessCaseData = { rawContent: customer.businessCaseContent };
        }
      }

      res.status(200).json({
        success: true,
        data: {
          customerId: customer.customerId,
          businessCaseData,
          contentStatus: customer.contentStatus,
          lastAccessed: customer.lastAccessed
        }
      });
    } catch (error) {
      logger.error(`Error fetching business case for customer ${req.params.customerId}:`, error);
      throw error;
    }
  },

  // Customize existing business case
  async customizeBusinessCase(req, res) {
    try {
      const { customerId, businessCaseId, customizations } = req.body;
      
      const customer = await airtableService.getCustomerById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }

      let businessCases = {};
      if (customer.businessCaseContent) {
        try {
          businessCases = JSON.parse(customer.businessCaseContent);
        } catch (parseError) {
          logger.warn(`Malformed business case JSON for customer ${customerId}:`, parseError);
        }
      }

      if (!businessCases[businessCaseId]) {
        return res.status(404).json({
          success: false,
          error: 'Business case not found'
        });
      }

      // Apply customizations
      const businessCase = { ...businessCases[businessCaseId] };
      Object.keys(customizations).forEach(key => {
        if (key === 'budgetAdjustments') {
          const adjustment = customizations[key];
          businessCase.investment.totalCost += adjustment.additionalCosts || 0;
        } else {
          businessCase[key] = customizations[key];
        }
      });

      businessCases[businessCaseId] = businessCase;
      
      await airtableService.updateCustomer(customerId, {
        'Business Case Content': JSON.stringify(businessCases)
      });

      res.status(200).json({
        success: true,
        data: {
          businessCase,
          customizations: {
            applied: Object.keys(customizations),
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      logger.error(`Error customizing business case:`, error);
      throw error;
    }
  },

  // Save business case
  async saveBusinessCase(req, res) {
    try {
      const { customerId, businessCase } = req.body;
      
      const customer = await airtableService.getCustomerById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }

      const businessCaseId = `bc_${Date.now()}`;
      let businessCases = {};
      
      if (customer.businessCaseContent) {
        try {
          businessCases = JSON.parse(customer.businessCaseContent);
        } catch (parseError) {
          logger.warn(`Malformed business case JSON for customer ${customerId}:`, parseError);
        }
      }

      businessCases[businessCaseId] = {
        ...businessCase,
        id: businessCaseId,
        createdAt: new Date().toISOString()
      };

      await airtableService.updateCustomer(customerId, {
        'Business Case Content': JSON.stringify(businessCases)
      });

      res.status(200).json({
        success: true,
        data: {
          customerId,
          businessCaseId,
          saved: true
        }
      });
    } catch (error) {
      logger.error(`Error saving business case:`, error);
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
      const downloadUrl = `https://api.hs-platform.com/exports/${exportId}.${format}`;

      res.status(200).json({
        success: true,
        data: {
          downloadUrl,
          format,
          filename: `Business_Case_${businessCaseId}.${format}`,
          fileSize: 2048,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      });
    } catch (error) {
      logger.error(`Error exporting business case:`, error);
      throw error;
    }
  },

  // Get available templates
  async getTemplates(req, res) {
    try {
      const { type } = req.query;
      
      let templates = [
        {
          name: 'Pilot Program Proposal',
          type: 'pilot',
          duration: '3-6 months',
          investment: '$25,000-$75,000',
          sections: [
            'Executive Summary',
            'Problem Statement',
            'Proposed Solution',
            'Success Metrics',
            'Investment & ROI',
            'Next Steps'
          ],
          keyPoints: [
            'Low-risk evaluation period',
            'Measurable success criteria',
            'Clear path to full implementation'
          ]
        },
        {
          name: 'Full Implementation Business Case',
          type: 'full',
          duration: '6-18 months',
          investment: '$100,000-$500,000',
          sections: [
            'Strategic Alignment',
            'Current State Analysis',
            'Solution Architecture',
            'Financial Projections',
            'Risk Assessment',
            'Implementation Timeline'
          ],
          keyPoints: [
            'Comprehensive transformation',
            'Long-term value creation',
            'Competitive advantage'
          ]
        }
      ];

      if (type) {
        templates = templates.filter(t => t.type === type);
      }

      res.status(200).json({
        success: true,
        data: { templates }
      });
    } catch (error) {
      logger.error(`Error getting business case templates:`, error);
      throw error;
    }
  },

  // Get business case history
  async getBusinessCaseHistory(req, res) {
    try {
      const { customerId } = req.params;
      
      const customer = await airtableService.getCustomerById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }

      let businessCases = [];
      if (customer.businessCaseContent) {
        try {
          const content = JSON.parse(customer.businessCaseContent);
          businessCases = Object.entries(content).map(([id, data]) => ({
            id,
            ...data
          })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } catch (parseError) {
          logger.warn(`Malformed business case JSON for customer ${customerId}:`, parseError);
        }
      }

      res.status(200).json({
        success: true,
        data: {
          customerId,
          businessCases
        }
      });
    } catch (error) {
      logger.error(`Error fetching business case history:`, error);
      throw error;
    }
  }
};

// Helper functions
function calculateExpectedROI(budget, caseType) {
  const roiMultipliers = {
    pilot: 1.5,
    full_implementation: 2.5
  };
  return `${Math.round((roiMultipliers[caseType] - 1) * 100)}% - ${Math.round((roiMultipliers[caseType] * 1.5 - 1) * 100)}%`;
}

function calculateProjectedBenefits(budget, caseType, industry) {
  const industryMultipliers = {
    technology: 1.2,
    finance: 1.1,
    healthcare: 1.0,
    manufacturing: 0.9,
    retail: 0.8
  };
  
  const multiplier = industryMultipliers[industry] || 1.0;
  const baseBenefit = caseType === 'pilot' ? budget * 1.5 : budget * 2.5;
  
  return Math.round(baseBenefit * multiplier);
}

function calculatePaybackPeriod(budget, caseType) {
  return caseType === 'pilot' ? '6-9 months' : '12-18 months';
}

function generateImplementationPhases(caseType, timeline) {
  if (caseType === 'pilot') {
    return [
      { phase: 'Setup & Configuration', duration: '2-4 weeks', activities: ['System setup', 'Data integration', 'User training'] },
      { phase: 'Pilot Execution', duration: '8-16 weeks', activities: ['User onboarding', 'Process optimization', 'Performance monitoring'] },
      { phase: 'Evaluation & Next Steps', duration: '2-4 weeks', activities: ['Results analysis', 'ROI assessment', 'Expansion planning'] }
    ];
  } else {
    return [
      { phase: 'Foundation', duration: '4-8 weeks', activities: ['Infrastructure setup', 'System integration', 'Team preparation'] },
      { phase: 'Implementation', duration: `${Math.floor(timeline * 0.6)} weeks`, activities: ['Rollout execution', 'User adoption', 'Process optimization'] },
      { phase: 'Optimization', duration: `${Math.floor(timeline * 0.3)} weeks`, activities: ['Performance tuning', 'Advanced features', 'Scale preparation'] }
    ];
  }
}

function generateMilestones(caseType, timeline) {
  const milestones = [];
  const phases = Math.ceil(timeline / 3);
  
  for (let i = 1; i <= 3; i++) {
    milestones.push({
      milestone: `Phase ${i} Completion`,
      timeframe: `Month ${i * phases}`,
      deliverable: `Phase ${i} objectives achieved and validated`
    });
  }
  
  return milestones;
}

function generateRiskMitigation(caseType, companySize) {
  const baseRisks = [
    { risk: 'User adoption challenges', mitigation: 'Comprehensive training and change management' },
    { risk: 'Technical integration issues', mitigation: 'Thorough testing and phased rollout' },
    { risk: 'Resource allocation conflicts', mitigation: 'Clear project governance and stakeholder alignment' }
  ];
  
  if (companySize === 'enterprise') {
    baseRisks.push({ risk: 'Complex approval processes', mitigation: 'Executive sponsorship and streamlined decision-making' });
  }
  
  return baseRisks;
}

function generateMeasurementPlan(caseType, timeline) {
  return {
    frequency: caseType === 'pilot' ? 'Weekly' : 'Monthly',
    keyCheckpoints: [`Month 1`, `Month ${Math.ceil(timeline/2)}`, `Month ${timeline}`],
    reportingStructure: 'Executive dashboard with automated metrics collection'
  };
}

function generateNextSteps(caseType) {
  if (caseType === 'pilot') {
    return [
      'Finalize pilot scope and success criteria',
      'Prepare pilot environment and user accounts',
      'Schedule kickoff meeting and training sessions',
      'Establish reporting and feedback mechanisms'
    ];
  } else {
    return [
      'Secure executive approval and resource allocation',
      'Finalize technical requirements and integration plan',
      'Establish project governance and communication plan',
      'Begin vendor evaluation and contract negotiation'
    ];
  }
}

export default businessCaseController;