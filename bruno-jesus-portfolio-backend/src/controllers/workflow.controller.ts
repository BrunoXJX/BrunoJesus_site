import type { FastifyRequest, FastifyReply } from 'fastify';

interface QualifyLeadBody {
  name?: string;
  email?: string;
  company?: string;
  role?: string;
  message?: string;
}

export const qualifyLead = async (request: FastifyRequest<{ Body: QualifyLeadBody }>, reply: FastifyReply) => {
  try {
    const { name, email, company, role, message } = request.body || {};
    
    // Validate request
    if (!email) {
      return reply.status(400).send({ status: 'error', message: 'Email is required' });
    }

    // Node 2: Data Enrichment Simulation (Clearbit/Apollo)
    const domain = email.split('@')[1] || '';
    const isEnterprise = !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(domain);
    
    const enrichedData = {
      companySize: isEnterprise ? '500-1000' : '1-10',
      industry: isEnterprise ? 'Technology' : 'Other',
      estimatedRevenue: isEnterprise ? '$10M+' : '<$100k'
    };

    // Node 3: AI Processing (OpenAI Simulation)
    let score = 30; // base score
    if (isEnterprise) score += 30;
    if (role && role.toLowerCase().match(/ceo|cto|founder|director|manager/)) score += 20;
    if (message && message.length > 50) score += 10;
    
    score += Math.floor(Math.random() * 10);
    score = Math.min(score, 100);

    const isVip = score >= 80;

    // AI generated draft email
    const draftEmail = isVip 
      ? `Hi ${name || 'there'},\n\nI noticed ${domain} is doing great things in ${enrichedData.industry}. Let's discuss our enterprise solutions.`
      : `Hi ${name || 'there'},\n\nThanks for reaching out! Check out our self-service guides.`;

    // Wait a bit to simulate real AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    return reply.status(200).send({
      status: 'success',
      data: {
        leadInfo: { email, name, company, role },
        enrichment: enrichedData,
        aiAnalysis: {
          leadScore: score,
          isVip,
          suggestedEmail: draftEmail
        },
        actionsTaken: isVip 
          ? ['Slack VIP Alert Sent', 'Draft Email Scheduled via Resend'] 
          : ['Added to Mailchimp Nurture Campaign']
      }
    });

  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ status: 'error', message: 'Internal Server Error' });
  }
};
