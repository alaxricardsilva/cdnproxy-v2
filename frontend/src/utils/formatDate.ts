// Função utilitária para formatar datas no padrão DD/MM/YYYY HH:MM:SS e fuso horário America/Sao_Paulo
export function formatDateToSaoPaulo(dateInput: Date | string | number): string {
    const date = typeof dateInput === 'string' || typeof dateInput === 'number'
        ? new Date(dateInput)
        : dateInput;

    const options: Intl.DateTimeFormatOptions = {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    };

    // O formato padrão do Intl.DateTimeFormat é MM/DD/YYYY, então precisamos rearranjar
    const formatted = new Intl.DateTimeFormat('pt-BR', options).format(date);
    // formatted: "dd/mm/yyyy hh:mm:ss"
    // Garantir que está no formato desejado
    return formatted.replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$2/$1/$3 $4:$5:$6');
}