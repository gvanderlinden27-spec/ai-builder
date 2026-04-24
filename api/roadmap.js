const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID = process.env.NOTION_DATABASE_ID;

const STATUS_TO_COL = {
  'Suggested':   'suggested',
  'To Build':    'to-build',
  'In Progress': 'in-progress',
  'Done':        'done',
};

const COL_TO_STATUS = {
  'suggested':   'Suggested',
  'to-build':    'To Build',
  'in-progress': 'In Progress',
  'done':        'Done',
};

const PRIORITY_MAP = {
  'High':   'high',
  'Medium': 'medium',
  'Low':    'low',
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const response = await notion.databases.query({ database_id: DB_ID });
    const cards = response.results.map(page => {
      const props = page.properties;
      const status = props.Status?.select?.name || 'Suggested';
      return {
        id:          page.id,
        name:        props.Name?.title?.[0]?.plain_text || 'Untitled',
        desc:        props.Description?.rich_text?.[0]?.plain_text || '',
        priority:    PRIORITY_MAP[props.Priority?.select?.name] || 'low',
        col:         STATUS_TO_COL[status] || 'suggested',
        submittedBy: props['Submitted by']?.rich_text?.[0]?.plain_text || '',
      };
    });
    return res.json(cards);
  }

  if (req.method === 'PATCH') {
    const { id, col } = req.body;
    const status = COL_TO_STATUS[col];
    if (!id || !status) return res.status(400).json({ error: 'Invalid id or col' });
    await notion.pages.update({
      page_id: id,
      properties: { Status: { select: { name: status } } },
    });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
