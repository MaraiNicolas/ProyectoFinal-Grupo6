namespace ProyectoFinal_Grupo6.Api.Dominio.Modelos
{
    public class FinnegansUserInfo
    {
        public string Email { get; set; } = string.Empty;
        public string? Domain { get; set; }
        public bool Admin { get; set; }
        public string? PanelUsuarioCodigo { get; set; }
    }
}
