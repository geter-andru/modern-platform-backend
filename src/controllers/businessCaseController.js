import supabaseDataService from '../services/supabaseDataService.js';
// import airtableService from '../services/airtableService.js'; // REMOVED - migration complete
import logger from '../utils/logger.js';

const businessCaseController = {
  // Generate business case
  async generateBusinessCase(req, res) {
    try {
      const {
        customerId,
        type: caseType,
        requirements,
        context
      } = req.body;

      // Extract fields from nested structure
      const { budget, timeline, successMetrics, teamSize } = requirements;
      const { industry, companySize, currentChallenges } = context;

      // Normalize caseType - support both 'full' and 'full_implementation'
      const normalizedCaseType = caseType === 'full' ? 'full_implementation' : caseType;

      logger.info(`Generating ${caseType} business case for customer ${customerId}`);

      // Get existing customer data for context
      const customer = await supabaseDataService.getCustomerById(customerId);
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

      const template = businessCaseTemplates[normalizedCaseType];

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

      // Generate business case structure (matching test expectations)
      const executiveSummaryText = `${customer.customerName} seeks to optimize revenue intelligence processes in the ${industry} market. ` +
        `This ${normalizedCaseType === 'pilot' ? 'pilot program' : 'full implementation'} proposal outlines an investment of $${budget.toLocaleString()} over ${timeline} ` +
        `to implement the H&S Revenue Intelligence Platform with an expected ROI of ${calculateExpectedROI(budget, normalizedCaseType)}.`;

      const problemStatementText = `${customer.customerName} faces challenges in revenue intelligence processes including: ${
        currentChallenges && currentChallenges.length > 0
          ? currentChallenges.join(', ')
          : 'manual processes, data silos, and inefficient workflows'
      }. These challenges are impacting business growth and operational efficiency in the ${companySize} segment of the ${industry} industry.`;

      const proposedSolutionText = `Implement H&S Revenue Intelligence Platform for ${normalizedCaseType === 'pilot' ? 'pilot evaluation' : 'full transformation'}. ` +
        `This solution will address current challenges through automated workflows, integrated data systems, and AI-powered insights. ` +
        `The implementation timeline is ${timeline} with a total investment of $${budget.toLocaleString()}.`;

      const businessCase = {
        type: caseType,
        customerId,
        industry,
        companySize,
        executiveSummary: executiveSummaryText,
        problemStatement: problemStatementText,
        proposedSolution: proposedSolutionText,
        investment: {
          totalCost: budget,
          timeline: timeline,
          breakdown: {
            platformLicense: Math.floor(budget * 0.4),
            implementation: Math.floor(budget * 0.3),
            training: Math.floor(budget * 0.15),
            support: Math.floor(budget * 0.15)
          },
          expectedROI: calculateExpectedROI(budget, normalizedCaseType),
          paybackPeriod: calculatePaybackPeriod(budget, normalizedCaseType)
        },
        expectedOutcomes: [
          `Revenue increase through improved sales intelligence`,
          `Cost reduction via process automation`,
          `Enhanced decision-making with AI-powered insights`,
          `Improved team productivity and efficiency`,
          `Scalable foundation for future growth`
        ],
        successMetrics: successMetrics,
        riskAssessment: {
          technicalRisks: generateRiskMitigation(normalizedCaseType, companySize),
          mitigation: `Comprehensive risk mitigation strategy including phased rollout, dedicated support team, and continuous monitoring`,
          overallRiskLevel: normalizedCaseType === 'pilot' ? 'Low' : 'Medium'
        },
        nextSteps: generateNextSteps(normalizedCaseType),
        generatedAt: new Date().toISOString()
      };

      // Add comprehensive content for full implementation business cases
      if (normalizedCaseType === 'full_implementation') {
        businessCase.strategicAlignment = {
          businessObjectives: [
            `Align revenue operations with ${industry} market dynamics`,
            `Build competitive advantage through data-driven intelligence`,
            `Enable scalable growth infrastructure`
          ],
          strategicImperative: `Transform revenue intelligence capabilities to support long-term growth objectives in the ${companySize} ${industry} market`,
          executiveSponsorship: `Executive leadership commitment required for enterprise-wide transformation`
        };

        businessCase.currentStateAnalysis = {
          challenges: currentChallenges || ['Legacy systems', 'Data fragmentation', 'Manual processes'],
          gaps: [
            `Lack of integrated revenue intelligence platform`,
            `Limited AI/ML capabilities for predictive insights`,
            `Inefficient cross-functional collaboration`
          ],
          opportunityCost: `Estimated annual opportunity cost: $${Math.floor(budget * 2).toLocaleString()} in lost revenue and operational inefficiencies`
        };

        businessCase.solutionArchitecture = {
          components: [
            `AI-powered revenue intelligence engine`,
            `Integrated data platform and analytics`,
            `Workflow automation and orchestration`,
            `Real-time insights and dashboards`,
            `Advanced reporting and forecasting`
          ],
          integrations: [
            `CRM systems integration`,
            `Marketing automation platforms`,
            `Data warehouses and BI tools`,
            `Communication and collaboration tools`
          ],
          scalability: `Enterprise-grade architecture supporting ${companySize} organizations with capacity for 10x growth`
        };
      }

      // Save business case to customer record
      await supabaseDataService.updateCustomer(customerId, {
        business_case_content: JSON.stringify(businessCase),
        content_status: 'Ready',
        last_accessed: new Date().toISOString()
      });

      // Create user progress record
      await supabaseDataService.updateUserProgress(customerId, 'business_case', {
        type: caseType,
        industry,
        companySize,
        budget,
        timeline,
        completedAt: new Date().toISOString()
      });

      logger.info(`Business case generated for customer ${customerId}, type: ${caseType}, budget: $${budget}`);

      res.status(200).json({
        success: true,
        data: {
          businessCase,
          metadata: {
            generatedAt: businessCase.generatedAt,
            customerId: businessCase.customerId,
            version: '1.0'
          }
        }
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

      const customer = await supabaseDataService.getCustomerById(customerId);
      
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

      const customer = await supabaseDataService.getCustomerById(customerId);
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

      await supabaseDataService.updateCustomer(customerId, {
        business_case_content: JSON.stringify(businessCases)
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

      const customer = await supabaseDataService.getCustomerById(customerId);
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

      await supabaseDataService.updateCustomer(customerId, {
        business_case_content: JSON.stringify(businessCases)
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

      const customer = await supabaseDataService.getCustomerById(customerId);
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
  },

  // Generate simplified one-page business case for MVP
  async generateSimplifiedBusinessCase(req, res) {
    try {
      const { costAnalysis, icpData, productData } = req.body;

      // Validate required data
      if (!costAnalysis || !costAnalysis.totalCost) {
        return res.status(400).json({
          success: false,
          error: 'Cost analysis data required'
        });
      }

      logger.info('Generating simplified one-page business case');

      const onePager = {
        title: 'Revenue Intelligence Investment Case',
        generatedAt: new Date().toISOString(),

        // Executive summary with top 3 findings
        executiveSummary: {
          totalCostOfDelay: costAnalysis.totalCost,
          totalCostFormatted: `$${(costAnalysis.totalCost / 1000000).toFixed(1)}M`,
          topFindings: [
            `$${(costAnalysis.lostRevenue / 1000000).toFixed(1)}M in lost revenue opportunity`,
            `${costAnalysis.delayMonths} months average sales cycle delay`,
            `${costAnalysis.potentialDeals} qualified opportunities at risk`
          ]
        },

        // Key metrics
        metrics: {
          inefficientProspecting: {
            label: 'Inefficient Prospecting Cost',
            value: costAnalysis.inefficientProspecting,
            formatted: `$${(costAnalysis.inefficientProspecting / 1000).toFixed(0)}K`,
            impact: 'Sales team wasting time on poor-fit prospects'
          },
          poorMessaging: {
            label: 'Poor Messaging Cost',
            value: costAnalysis.poorMessaging,
            formatted: `$${(costAnalysis.poorMessaging / 1000).toFixed(0)}K`,
            impact: 'Messages failing to resonate with buyers'
          },
          lostRevenue: {
            label: 'Lost Revenue',
            value: costAnalysis.lostRevenue,
            formatted: `$${(costAnalysis.lostRevenue / 1000000).toFixed(1)}M`,
            impact: 'Deals lost or delayed due to poor targeting'
          }
        },

        // Primary recommendation
        recommendation: {
          title: 'Implement ICP-Driven Revenue Intelligence',
          description: 'Deploy systematic buyer intelligence framework to reduce qualification time and improve conversion rates',
          expectedImpact: [
            'Reduce sales cycle by 30-40%',
            'Improve qualification accuracy by 50%+',
            'Increase win rates through better targeting'
          ]
        },

        // Immediate next steps (max 5)
        nextSteps: [
          {
            step: 1,
            title: 'Review ICP Analysis',
            description: 'Validate ideal customer profile findings with sales team',
            owner: 'Sales Leadership',
            timeline: 'Week 1'
          },
          {
            step: 2,
            title: 'Align on Buyer Personas',
            description: 'Ensure all revenue team members understand target personas',
            owner: 'Revenue Operations',
            timeline: 'Week 1-2'
          },
          {
            step: 3,
            title: 'Implement Qualification Framework',
            description: 'Deploy ICP-based lead scoring and qualification criteria',
            owner: 'Sales Operations',
            timeline: 'Week 2-3'
          },
          {
            step: 4,
            title: 'Update Messaging & Content',
            description: 'Align sales materials with ICP pain points and language',
            owner: 'Marketing',
            timeline: 'Week 3-4'
          },
          {
            step: 5,
            title: 'Measure & Iterate',
            description: 'Track conversion metrics and refine ICP based on results',
            owner: 'Revenue Operations',
            timeline: 'Ongoing'
          }
        ],

        // Supporting context from ICP if available
        icpContext: icpData ? {
          targetSegment: icpData.targetMarket || 'Not specified',
          keyPainPoints: icpData.painPoints?.slice(0, 3) || [],
          buyingTriggers: icpData.buyingTriggers?.slice(0, 3) || []
        } : null,

        // Product context if available
        productContext: productData ? {
          name: productData.productName || 'Not specified',
          businessModel: productData.businessModel || 'Not specified'
        } : null
      };

      res.status(200).json({
        success: true,
        data: onePager
      });

    } catch (error) {
      logger.error('Error generating simplified business case:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate business case',
        details: error.message
      });
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