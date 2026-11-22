/** Shared fakes for controller tests — no database, same monkeypatch style as the existing tests. */

function response() {
  return {
    statusCode: null,
    body: undefined,
    cookies: [],
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    cookie(name, value) {
      this.cookies.push({ name, value });
      return this;
    },
    clearCookie(name) {
      this.cookies.push({ name, value: null });
      return this;
    },
    end() {
      return this;
    },
  };
}

/** A fake query: chainable like Mongoose's, awaitable via `then`. */
function queryResult(value) {
  const query = {
    select() {
      return this;
    },
    populate() {
      return this;
    },
    sort() {
      return this;
    },
    limit() {
      return this;
    },
    lean() {
      return Promise.resolve(value);
    },
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
  return query;
}

async function withMocks(mocks, run) {
  const saved = Object.entries(mocks).map(([key, entry]) => {
    const original = entry.object[entry.method];
    entry.object[entry.method] = entry.value;
    return { ...entry, original };
  });
  try {
    return await run();
  } finally {
    for (const entry of saved) entry.object[entry.method] = entry.original;
  }
}

module.exports = { response, queryResult, withMocks };
