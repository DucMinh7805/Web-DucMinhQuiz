const syncHandler = require('./api/sync.cjs');

const req = {
  method: 'GET',
  query: {
    formId: '1Sh-Rc0-5hnEiXyGDbPzPqzZxO3NBH-DOme69uqCTZXs',
    deckPath: 'test/giai-phau/de-1',
    subjectName: 'Gi?i Ph?u',
    tags: 'PRO,Th?c t?p'
  }
};

const res = {
  setHeader: () => {},
  status: (code) => ({
    json: (data) => console.log(`STATUS ${code}:`, JSON.stringify(data, null, 2)),
    end: () => console.log(`STATUS ${code}: END`)
  })
};

syncHandler(req, res).then(() => {
  console.log("Done test");
  process.exit(0);
});
