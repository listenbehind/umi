
export default async function ({ page, host }) {
  await page.goto(`${host}/`, {
    waitUntil: 'networkidle2',
  });
  const body = await page.evaluate(
    () => document.querySelector('body').innerHTML,
  );
  console.log(body);
};
