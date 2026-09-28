select json_build_object(
  'produtos', coalesce((
    select json_agg(json_build_object(
      'codigo', v._idmercadoriavariacao,
      'descricao', v.descricao,
      'grupo', g.descricao,
      'secao', s.descricao,
      'subgrupo', sg.descricao,
      'marca', ma.descricao,
      'custo', cu.valcusto::text,
      'inativo', ve.flaginativo
    ) order by v._idmercadoriavariacao)
    from mercadoria_variacao v
    left join mercadoria m on m._idmercadoria = v.idmercadoria
    left join mercadoria_grupo g on g._idgrupo = m.idgrupo
    left join mercadoria_secao s on s._idsecao = m.idsecao
    left join mercadoria_subgrupo sg on sg._idsubgrupo = m.idsubgrupo
    left join mercadoria_marca ma on ma._idmarca = v.idmarca
    left join mercadoria_custo cu on cu._idmercadoriavariacao = v._idmercadoriavariacao and cu._idempresa = 1
    left join mercadoria_variacao_empresa ve on ve._idmercadoriavariacao = v._idmercadoriavariacao and ve._idempresa = 1
  ), '[]'),
  'pessoas', coalesce((
    select json_agg(json_build_object(
      'codigo', p._idpessoa,
      'nome', p.nome,
      'sobrenome', p.sobrenome,
      'cpf_cnpj', p.cnpjcpf,
      'bairro', en.bairro,
      'municipio', mu.nome,
      'ibge', en.idibgemunicipio,
      'uf', en.uf,
      'inativo', p.flaginativo
    ) order by p._idpessoa)
    from pessoa p
    left join lateral (
      select pe.bairro, pe.idibgemunicipio, pe.uf
      from pessoa_endereco pe
      where pe._idpessoa = p._idpessoa and pe.flagprincipal = 'T' and pe.flaginativo = 'F'
      order by pe._idendereco
      limit 1
    ) en on true
    left join municipio mu on mu._idmunicipio = en.idibgemunicipio
  ), '[]'),
  'funcionarios', coalesce((
    select json_agg(json_build_object(
      'codigo', f._idpessoa,
      'nome', fp.nome,
      'sobrenome', fp.sobrenome,
      'usuario', f.idusuario,
      'tipo', f.tipo,
      'inativo', f.flaginativo
    ) order by f._idpessoa)
    from pessoa_funcionario f
    left join pessoa fp on fp._idpessoa = f._idpessoa
    where f._idempresa = 1
  ), '[]'),
  'fornecedores', coalesce((
    select json_agg(json_build_object(
      'produto', vp._idmercadoriavariacao,
      'fornecedor', vp._idpessoa
    ) order by vp._idmercadoriavariacao, vp._idpessoa)
    from mercadoria_variacao_pessoa vp
    where vp._idempresa = 1 and vp.flaginativo = 'F'
  ), '[]')
)::text as dados
