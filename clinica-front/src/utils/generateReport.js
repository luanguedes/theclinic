import jsPDF from 'jspdf';

export const generateConflictReport = (pacientes, motivoBloqueio) => {
    const doc = new jsPDF();
    
    // Configurações visuais
    const primaryColor = [37, 99, 235]; // Azul
    const lineColor = [220, 220, 220]; // Cinza claro

    // Cabeçalho
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.text("Relatório de Conflitos de Agenda", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Motivo do Bloqueio: ${motivoBloqueio}`, 14, 28);
    doc.text(`Data de Emissão: ${new Date().toLocaleString()}`, 14, 34);

    doc.setDrawColor(...primaryColor);
    doc.line(14, 38, 196, 38);

    let y = 45;

    // Cabeçalho da Tabela
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    
    doc.text("DATA/HORA", 14, y);
    doc.text("MÉDICO", 45, y);
    doc.text("PACIENTE / CPF", 95, y);
    doc.text("CONTATO", 160, y);
    
    y += 4;
    doc.setDrawColor(...lineColor);
    doc.line(14, y, 196, y);
    y += 6;

    // Lista de Pacientes
    doc.setFont("helvetica", "normal");
    
    pacientes.forEach((p) => {
        // Verifica se precisa de nova página
        if (y > 270) {
            doc.addPage();
            y = 20;
        }

        const dataF = new Date(p.data).toLocaleDateString('pt-BR');
        const horaF = p.horario.substring(0, 5);
        const nascimento = new Date(p.paciente_nascimento).toLocaleDateString('pt-BR');

        doc.setFontSize(9);
        doc.text(`${dataF} ${horaF}`, 14, y);
        
        // Médico (trunca se for longo)
        const medico = p.medico.length > 25 ? p.medico.substring(0, 22) + '...' : p.medico;
        doc.text(medico, 45, y);

        // Paciente (Duas linhas: Nome e CPF/Nasc)
        doc.setFont("helvetica", "bold");
        doc.text(p.paciente_nome, 95, y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`CPF: ${p.paciente_cpf} - Nasc: ${nascimento}`, 95, y + 4);

        // Telefone
        doc.setFontSize(9);
        doc.text(p.paciente_telefone || "Sem telefone", 160, y);

        y += 8;
        doc.setDrawColor(240); // Linha bem suave
        doc.line(14, y, 196, y);
        y += 6;
    });

    // Rodapé
    const total = pacientes.length;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Total de Pacientes Afetados: ${total}`, 14, y + 5);

    window.open(doc.output('bloburl'), '_blank');
};