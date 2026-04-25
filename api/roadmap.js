const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID  = process.env.NOTION_DATABASE_ID;

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
const PRIORITY_IN  = { 'High': 'high', 'Medium': 'medium', 'Low': 'low' };
const PRIORITY_OUT = { 'high': 'High', 'medium': 'Medium', 'low': 'Low' };

function rt(text) {
  return { rich_text: [{ text: { content: text || '' } }] };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ── GET: list all cards ─────────────────────────────────────────────────
    if (req.method === 'GET') {
      const response = await notion.databases.query({ database_id: DB_ID });
      const cards = response.results.map(page => {
        const p = page.properties;
        return {
          id:       page.id,
          name:     p.Name?.title?.[0]?.plain_text || 'Untitled',
          desc:     p.Description?.rich_text?.[0]?.plain_text || '',
          priority: PRIORITY_IN[p.Priority?.select?.name] || 'low',
          col:      STATUS_TO_COL[p.Status?.select?.name] || 'suggested',
          hours:    p['Hours per Week']?.number || 0,
          notes:    p.Notes?.rich_text?.[0]?.plain_text || '',
          submittedBy: p['Submitted by']?.rich_text?.[0]?.plain_text || '',
        };
      });
      return res.json(cards);
    }

    // ── PATCH: update any combination of fields ─────────────────────────────
    if (req.method === 'PATCH') {
      const { id, col, priority, hours, notes } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing id' });

      const properties = {};
      if (col      !== undefined) properties.Status             = { select: { name: COL_TO_STATUS[col] } };
      if (priority !== undefined) properties.Priority           = { select: { name: PRIORITY_OUT[priority] } };
      if (hours    !== undefined) properties['Hours per Week']  = { number: hours };
      if (notes    !== undefined) properties.Notes              = rt(notes);

      await notion.pages.update({ page_id: id, properties });
      return res.json({ ok: true });
    }

    // ── POST: create a new card ─────────────────────────────────────────────
    if (req.method === 'POST') {
      const { name, desc, priority, hours, notes } = req.body;
      if (!name) return res.status(400).json({ error: 'Missing name' });

      const page = await notion.pages.create({
        parent: { database_id: DB_ID },
        properties: {
          Name:               { title: [{ text: { content: name } }] },
          Description:        rt(desc),
          Priority:           { select: { name: PRIORITY_OUT[priority] || 'Medium' } },
          Status:             { select: { name: 'Suggested' } },
          'Hours per Week':   { number: hours || 0 },
          Notes:              rt(notes),
        },
      });
      return res.json({ id: page.id });
    }

    // ── DELETE: archive a card ──────────────────────────────────────────────
    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      await notion.pages.update({ page_id: id, archived: true });
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
