export interface IClienteView {
    ClienteID: string;
    RazaoSocial: string | null;
    NomeCliente: string | null;
    Cnpj: string | null;
    NomeFantasia: string | null;
    TipoLogradouro: string | null;
    Logradouro: string | null;
    NumeroLogradouro: string | null;
    Complemento: string | null;
    Bairro: string | null;
    Cidade: string | null;
    Uf: string | null;
    Cep: string | null;
    Telefone: string | null;
    Codigo: string | null;
}

export interface IClienteForm {
    RazaoSocial: string | null;
    NomeCliente: string | null;
    Cnpj: string | null;
    NomeFantasia: string | null;
    TipoLogradouro: string | null;
    Logradouro: string | null;
    NumeroLogradouro: string | null;
    Complemento: string | null;
    Bairro: string | null;
    Cidade: string | null;
    Uf: string | null;
    Cep: string | null;
    Telefone: string | null;
    Codigo: string | null;
}