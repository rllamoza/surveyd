const fs = require('fs');
const path = require('path');

function toTitleCase(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/(?:^|\s|\/|-)\S/g, function(a) { return a.toUpperCase(); });
}

function run() {
  const filePath = path.join(__dirname, 'database', 'ubigeo_peru_completo.json');
  const list = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const deps = {};
  const provs = {};
  const dists = {};

  for (const item of list) {
    const depCode = (item.cod_dep_inei || item.cod_dep_sunat || '').trim();
    const depName = toTitleCase((item.desc_dep_inei || item.desc_dep_sunat || '').trim());
    if (!depCode || depCode.includes('NA') || depCode.length !== 2) continue;

    if (!deps[depCode]) {
      deps[depCode] = { codigo: depCode, nombre: depName };
    }

    const provCode = (item.cod_prov_inei || item.cod_prov_sunat || '').trim();
    const provName = toTitleCase((item.desc_prov_inei || item.desc_prov_sunat || '').trim());
    if (!provCode || provCode.includes('NA') || provCode.length !== 4) continue;

    if (!provs[provCode]) {
      provs[provCode] = { codigo: provCode, dep_codigo: depCode, nombre: provName };
    }

    const distCode = (item.cod_ubigeo_inei || item.cod_ubigeo_sunat || '').trim();
    const distName = toTitleCase((item.desc_ubigeo_inei || item.desc_ubigeo_sunat || '').trim());
    if (!distCode || distCode.includes('NA') || distCode.length !== 6) continue;

    if (!dists[distCode]) {
      dists[distCode] = {
        codigo: distCode,
        prov_codigo: provCode,
        dep_codigo: depCode,
        nombre: distName
      };
    }
  }

  const depList = Object.values(deps).sort((a, b) => a.codigo.localeCompare(b.codigo));
  const provList = Object.values(provs).sort((a, b) => a.codigo.localeCompare(b.codigo));
  const distList = Object.values(dists).sort((a, b) => a.codigo.localeCompare(b.codigo));

  console.log('Departamentos limpios:', depList.length);
  console.log('Provincias limpias:', provList.length);
  console.log('Distritos limpios únicos:', distList.length);

  const sqlLines = [];
  sqlLines.push('USE `app_encuestas`;');
  sqlLines.push('SET FOREIGN_KEY_CHECKS = 0;');
  sqlLines.push('TRUNCATE TABLE `distritos`;');
  sqlLines.push('TRUNCATE TABLE `provincias`;');
  sqlLines.push('TRUNCATE TABLE `departamentos`;');
  sqlLines.push('SET FOREIGN_KEY_CHECKS = 1;');

  // Insert Departamentos
  const depValues = depList.map((d, i) => `(${i+1}, '${d.codigo}', '${d.nombre.replace(/'/g, "''")}')`).join(',\n');
  sqlLines.push(`INSERT INTO \`departamentos\` (\`id\`, \`codigo_ubigeo\`, \`nombre\`) VALUES \n${depValues};`);

  const depIdMap = {};
  depList.forEach((d, i) => { depIdMap[d.codigo] = i + 1; });

  // Insert Provincias
  const provValues = provList.map((p, i) => {
    const depId = depIdMap[p.dep_codigo] || 1;
    return `(${i+1}, ${depId}, '${p.codigo}', '${p.nombre.replace(/'/g, "''")}')`;
  }).join(',\n');
  sqlLines.push(`INSERT INTO \`provincias\` (\`id\`, \`departamento_id\`, \`codigo_ubigeo\`, \`nombre\`) VALUES \n${provValues};`);

  const provIdMap = {};
  provList.forEach((p, i) => { provIdMap[p.codigo] = i + 1; });

  // Insert Distritos en lotes de 250
  const batchSize = 250;
  for (let b = 0; b < distList.length; b += batchSize) {
    const batch = distList.slice(b, b + batchSize);
    const distValues = batch.map((d, i) => {
      const provId = provIdMap[d.prov_codigo] || 1;
      return `(${b + i + 1}, ${provId}, '${d.codigo}', '${d.nombre.replace(/'/g, "''")}')`;
    }).join(',\n');
    sqlLines.push(`INSERT INTO \`distritos\` (\`id\`, \`provincia_id\`, \`codigo_ubigeo\`, \`nombre\`) VALUES \n${distValues};`);
  }

  const sqlPath = path.join(__dirname, 'database', 'ubigeo_completo.sql');
  fs.writeFileSync(sqlPath, sqlLines.join('\n\n'), 'utf8');
  console.log('Generado ubigeo_completo.sql limpio y sin duplicados.');
}

run();
